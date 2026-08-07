import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderEmail, maxStageFor, CLUSTER_MAP, DEFAULT_REP, type Cluster, type Rep, type Stage, type TemplateLead } from "./templates.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// --- CLI ---------------------------------------------------------------
// npm run send                 -> real send, capped by today's ramp
// npm run send:dry             -> print the plan, send nothing
// npm run send:test you@x.com  -> one sample of every template to you
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const testIdx = argv.indexOf("--test");
const TEST_TO = testIdx >= 0 ? argv[testIdx + 1] : null;
const onlyIdx = argv.indexOf("--only");
const ONLY = onlyIdx >= 0 ? argv[onlyIdx + 1] : null; // limit test sends to one vertical

type Config = {
  campaignStart: string;
  ramp: { throughDay: number; dailyCap: number }[];
  followupGapDays: Record<string, number>;
  sendDelayMs: number;
};

type LeadRow = TemplateLead & {
  place_id: string;
  emails: string[];
  band: string;
  score: number;
  status: string;
  email_stage: number;
  last_emailed_at: string | null;
  crypto_native: boolean | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name} in .env`);
    process.exit(1);
  }
  return v;
}

function todaysCap(cfg: Config): number {
  const start = new Date(cfg.campaignStart + "T00:00:00");
  const day = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
  for (const r of cfg.ramp) if (day <= r.throughDay) return r.dailyCap;
  return cfg.ramp[cfg.ramp.length - 1].dailyCap;
}

function cityShort(city: string | null): string {
  return (city ?? "Phoenix").replace(/\s+AZ$/, "");
}

async function main() {
  const cfg: Config = JSON.parse(readFileSync(join(ROOT, "config", "campaign.json"), "utf8"));
  const supabase = createClient(need("SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"));
  const resend = new Resend(need("RESEND_API_KEY"));
  const BASE = need("PULSE_BASE_URL");
  const FROM = need("FROM_EMAIL");
  const REPLY_TO = need("REPLY_TO");
  const ADDRESS = need("PHYSICAL_ADDRESS");

  // --- Test mode: one of each template to a mailbox --------------------
  if (TEST_TO) {
    const sample: TemplateLead = {
      name: "Cloud Nine Smoke",
      city: "Tempe",
      vertical: "smoke-vape",
      vertical_label: "Smoke / Vape / CBD",
      owner_first_name: "Mike",
      pulse_token: "0000000000000000",
    };
    // Email 1 for every vertical (subjects/angle vary), then the full
    // sequence (e2 + e3) once per story cluster.
    const allVerticals = Object.keys(CLUSTER_MAP);
    const clusterReps = ["smoke-vape", "jewelry-gold", "barber", "phone-repair", "crypto-native"];
    let jobs: { stage: Stage; vertical: string }[] = [
      ...allVerticals.map((v) => ({ stage: 1 as Stage, vertical: v })),
      ...clusterReps.flatMap((v) => {
        const max = maxStageFor(CLUSTER_MAP[v] as Cluster);
        const stages: Stage[] = [];
        for (let st = 2; st <= max; st++) stages.push(st as Stage);
        return stages.map((stage) => ({ stage, vertical: v }));
      }),
    ];
    if (ONLY) jobs = jobs.filter((j) => j.vertical === ONLY);
    for (const { stage, vertical } of jobs) {
      const r = renderEmail(stage, { ...sample, vertical }, BASE, ADDRESS);
      const { error } = await resend.emails.send({
        from: FROM,
        to: TEST_TO,
        replyTo: REPLY_TO,
        subject: `[TEST ${vertical} e${stage}] ` + r.subject,
        html: r.html,
        text: r.text,
      });
      console.log(`test ${vertical} e${stage}:`, error ? `FAILED ${error.message}` : "sent");
      // Test batches hammer ONE inbox — pace gently so Gmail doesn't defer
      await sleep(Math.max(cfg.sendDelayMs, 3000));
    }
    console.log(`\n${jobs.length} test emails sent to ${TEST_TO}.`);
    return;
  }

  const cap = todaysCap(cfg);
  console.log(`Daily cap today: ${cap}`);

  // --- Rep routing: CRM owner assignment decides the sender ------------
  const { data: repRows } = await supabase
    .from("reps")
    .select("profile_id, first_name, from_email, cell, is_default, active")
    .eq("active", true);
  const repsById = new Map<string, Rep>(
    (repRows ?? []).map((r) => [r.profile_id, { first: r.first_name, fromEmail: r.from_email }])
  );
  const defaultRep: Rep =
    (repRows ?? [])
      .filter((r) => r.is_default)
      .map((r) => ({ first: r.first_name, fromEmail: r.from_email }))[0] ?? DEFAULT_REP;

  const { data: ownerRows } = await supabase
    .from("contacts")
    .select("legacy_id, owner_id")
    .not("legacy_id", "is", null)
    .not("owner_id", "is", null);
  const ownerByPlace = new Map<string, string>(
    (ownerRows ?? []).map((c) => [c.legacy_id as string, c.owner_id as string])
  );

  const repFor = (placeId: string): Rep => {
    const ownerId = ownerByPlace.get(placeId);
    return (ownerId && repsById.get(ownerId)) || defaultRep;
  };
  console.log(
    `Reps: ${(repRows ?? []).map((r) => r.first_name + (r.is_default ? "*" : "")).join(", ") || "none (env fallback)"} · ${ownerByPlace.size} owned contacts`
  );

  // --- Hard-engagement suppression set --------------------------------
  // Any non-view event = the lead is Eric's now; the sequence stops.
  const { data: engaged } = await supabase
    .from("engagement_events")
    .select("pulse_token")
    .neq("event", "view");
  const engagedTokens = new Set((engaged ?? []).map((e) => e.pulse_token));

  const SELECT =
    "place_id, name, city, vertical, vertical_label, owner_first_name, pulse_token, emails, band, score, status, email_stage, last_emailed_at, crypto_native";

  const cutoff = (days: number) =>
    new Date(Date.now() - days * 86400000).toISOString();

  const isNative = (l: LeadRow) => !!l.crypto_native || l.vertical === "crypto-native";
  const stageCap = (l: LeadRow) => maxStageFor(isNative(l) ? "native" : (CLUSTER_MAP[l.vertical] ?? "math"));

  // Follow-ups first, oldest stages first — a warm thread beats a cold open,
  // and leads closest to sequence-end close out before new threads open
  const followups: { lead: LeadRow; stage: Stage }[] = [];
  for (const stage of [6, 5, 4, 3, 2] as Stage[]) {
    const gap = cfg.followupGapDays[String(stage)];
    if (!gap) continue;
    const { data } = await supabase
      .from("nectarpay_leads")
      .select(SELECT)
      .eq("status", "EMAILED")
      .eq("email_stage", stage - 1)
      .lte("last_emailed_at", cutoff(gap))
      .neq("emails", "{}")
      .limit(cap);
    for (const l of (data ?? []) as LeadRow[]) {
      if (stage > stageCap(l)) continue; // native arc ends at 4
      followups.push({ lead: l, stage });
    }
  }

  // Fresh email-1s: two pools — named leads by score, then unnamed by
  // score. (A single owner_first_name sort was alphabetical, which put
  // "Zpace" ahead of a HOT named lead. Score is the real currency.)
  const { data: e1Named } = await supabase
    .from("nectarpay_leads")
    .select(SELECT)
    .eq("status", "NEW")
    .eq("email_stage", 0)
    .neq("emails", "{}")
    .not("owner_first_name", "is", null)
    .order("score", { ascending: false })
    .limit(cap * 2);

  const { data: e1Unnamed } = await supabase
    .from("nectarpay_leads")
    .select(SELECT)
    .eq("status", "NEW")
    .eq("email_stage", 0)
    .neq("emails", "{}")
    .is("owner_first_name", null)
    .order("score", { ascending: false })
    .limit(cap * 2);

  const e1 = [...(e1Named ?? []), ...(e1Unnamed ?? [])];

  type Job = { lead: LeadRow; stage: Stage };
  const jobs: Job[] = [...followups];
  for (const l of e1 as LeadRow[]) jobs.push({ lead: l, stage: 1 });

  // One email per inbox per run — multi-location chains share corporate
  // addresses (Zen Leaf x5 taught us this)
  const seenAddresses = new Set<string>();
  const plan = jobs
    .filter((j) => !engagedTokens.has(j.lead.pulse_token))
    .filter((j) => {
      const addr = j.lead.emails[0]?.toLowerCase();
      if (!addr || seenAddresses.has(addr)) return false;
      seenAddresses.add(addr);
      return true;
    })
    .slice(0, cap);

  const mix = ([6, 5, 4, 3, 2, 1] as Stage[])
    .map((st) => ({ st, n: plan.filter((j) => j.stage === st).length }))
    .filter(({ n }) => n > 0)
    .map(({ st, n }) => `${n} × e${st}`)
    .join(", ");
  console.log(
    `Plan: ${mix || "nothing due"} (${engagedTokens.size} engaged leads excluded from sequences)`
  );

  if (DRY) {
    for (const j of plan) {
      console.log(
        `  e${j.stage} [from ${repFor(j.lead.place_id).first}] -> ${j.lead.emails[0]}  [${j.lead.vertical}/${j.lead.band}] ${j.lead.name}` +
        (j.lead.owner_first_name ? ` (${j.lead.owner_first_name})` : "")
      );
    }
    console.log("\nDry run — nothing sent.");
    return;
  }

  // --- Send ------------------------------------------------------------
  mkdirSync(join(ROOT, "out"), { recursive: true });
  const log: string[] = ["stage,email,name,vertical,band,result"];
  let sent = 0;

  for (const { lead, stage } of plan) {
    const to = lead.emails[0];
    const rep = repFor(lead.place_id);
    const rendered = renderEmail(
      stage,
      {
        ...lead,
        city: cityShort(lead.city),
        // Flagged leads keep their locked vertical in the DB but get the
        // native story in email — vertical only drives cluster lookup here
        vertical: isNative(lead) ? "crypto-native" : lead.vertical,
      },
      BASE,
      ADDRESS,
      rep
    );

    const { error } = await resend.emails.send({
      from: `${rep.first} at NectarPay AZ <${rep.fromEmail}>`,
      to,
      replyTo: rep.fromEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (error) {
      console.error(`  ! e${stage} ${to}: ${error.message}`);
      log.push(`${stage},${to},"${lead.name}",${lead.vertical},${lead.band},FAILED`);
    } else {
      sent++;
      log.push(`${stage},${to},"${lead.name}",${lead.vertical},${lead.band},sent:${rep.first}`);
      const { error: upErr } = await supabase
        .from("nectarpay_leads")
        .update({
          status: "EMAILED",
          email_stage: stage,
          last_emailed_at: new Date().toISOString(),
        })
        .eq("place_id", lead.place_id);
      if (upErr) console.error(`  ! status update ${lead.place_id}: ${upErr.message}`);

      // Sibling locations sharing this inbox count as contacted too —
      // one chain, one email, never five
      const { error: sibErr } = await supabase
        .from("nectarpay_leads")
        .update({
          status: "EMAILED",
          email_stage: stage,
          last_emailed_at: new Date().toISOString(),
        })
        .eq("status", "NEW")
        .contains("emails", [to]);
      if (sibErr) console.error(`  ! sibling update ${to}: ${sibErr.message}`);
      if (sent % 20 === 0) console.log(`  ...${sent}/${plan.length}`);
    }
    await sleep(cfg.sendDelayMs);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  writeFileSync(join(ROOT, "out", `send-log-${stamp}.csv`), log.join("\n"), "utf8");
  console.log(`Done: ${sent}/${plan.length} sent. Log: out/send-log-${stamp}.csv`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
