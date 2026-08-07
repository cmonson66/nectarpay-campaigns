// Templates: 4 story clusters x 3 emails. Text-forward — cold email should
// read like a person typed it, not like a designed newsletter.

export type Cluster = "control" | "math" | "crowd" | "simple";

export const CLUSTER_MAP: Record<string, Cluster> = {
  "smoke-vape": "control",
  "kava-kratom": "control",
  "firearms": "control",
  "cigar-hookah": "control",
  "jewelry-gold": "math",
  "auto": "math",
  "powersports": "math",
  "barber": "crowd",
  "food-drink": "crowd",
  "tattoo": "crowd",
  "sneaker-street": "crowd",
  "collectibles": "crowd",
  "phone-repair": "simple",
  "gym-supps": "simple",
  "pawn": "control",
  "adult-retail": "control",
  "med-spa": "math",
  "pool-landscape": "math",
  "liquor": "math",
  "bike": "math",
  "nail-beauty": "crowd",
  "gaming": "crowd",
  "thrift-vintage": "crowd",
};

export type TemplateLead = {
  name: string;
  city: string;
  vertical: string;
  vertical_label: string;
  owner_first_name: string | null;
  pulse_token: string;
};

type Rendered = { subject: string; html: string; text: string };

export type Rep = { first: string; fromEmail: string };
export const DEFAULT_REP: Rep = { first: "Eric", fromEmail: "eric@nectarpayaz.com" };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------------------------------------------------------

function pulse(base: string, token: string, intent: string): string {
  return `${base}/s/${token}?i=${intent}`;
}

function buttons(base: string, token: string, pairs: [string, string][]): {
  html: string;
  text: string;
} {
  const html =
    `<p style="margin:18px 0 6px;font-weight:600">What's hitting home?</p>` +
    `<p style="margin:0 0 4px">` +
    pairs
      .map(
        ([intent, label]) =>
          `<a href="${pulse(base, token, intent)}" style="display:inline-block;margin:0 8px 8px 0;padding:9px 14px;border:1.5px solid #C9820A;border-radius:8px;color:#0C1A2C;text-decoration:none;font-weight:600">${esc(label)}</a>`
      )
      .join("") +
    `</p>`;
  const text =
    `\nWhat's hitting home? (tap one)\n` +
    pairs.map(([intent, label]) => `  ${label}: ${pulse(base, token, intent)}`).join("\n");
  return { html, text };
}

function footer(base: string, token: string, address: string, rep: Rep): { html: string; text: string } {
  const stop = pulse(base, token, "optout");
  return {
    html: `<p style="margin:26px 0 0;font-size:12px;color:#8a94a3">${esc(rep.first)} · NectarPay Ambassador, Phoenix<br>${esc(address)}<br><a href="${stop}" style="color:#8a94a3">Not for us — stop emailing</a></p>`,
    text: `\n--\n${rep.first} · NectarPay Ambassador, Phoenix\n${address}\nNot for us — stop emailing: ${stop}`,
  };
}

function greet(lead: TemplateLead): string {
  return lead.owner_first_name ? `${lead.owner_first_name} —` : `To the owner of ${lead.name} —`;
}

function wrapHtml(bodyHtml: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0C1A2C;max-width:560px">${bodyHtml}</div>`;
}

// --- Per-cluster copy blocks -----------------------------------------------

const E1: Record<Cluster, (l: TemplateLead) => { subject: string; paras: string[] }> = {
  control: (l) => ({
    subject: l.owner_first_name
      ? `Processors keep firing shops like yours, ${l.owner_first_name}`
      : `Processors keep firing shops like ${l.name}`,
    paras: [
      `You've seen it: a processor decides your industry is "high risk," and a shop down the street is suddenly begging a new one to take their money — at a worse rate.`,
      `I work with NectarPay here in the Valley. It's a small counter terminal that takes crypto payments with zero processing fee — the money lands in your own wallet the second the customer pays. Not a processor's account. Yours. Nobody can hold it, reverse it, or fire you from it.`,
      `Your card reader keeps doing its job. This sits next to it as the no-fee lane.`,
    ],
  }),
  math: (l) => ({
    subject: `What did cards cost ${l.name} last month?`,
    paras: [
      `On your ticket sizes, card processing is real money — roughly 3% comes off the top of every sale, and a delivered sale can still get reversed weeks later.`,
      `I work with NectarPay here in the Valley: a counter terminal that takes crypto payments with zero processing fee, settles to your own wallet in seconds, and can't be charged back. Flat $19/month — never a percentage of your sales.`,
      `I put your shop's numbers on a page — slide your monthly volume and watch what stays in the business.`,
    ],
  }),
  crowd: (l) => ({
    subject: `"Do you take crypto?" — ${l.city} edition`,
    paras: [
      `Somebody's already asked at your counter. Your crowd skews young, and that's exactly who holds crypto and picks the shops that take it.`,
      `I work with NectarPay here in the Valley — a small terminal that adds crypto as a payment option with zero processing fee. Money hits your own wallet instantly. Cards keep working exactly like today.`,
      `Being the first spot on the block that takes it is worth more than the fees it saves — and it saves those too.`,
    ],
  }),
  simple: (l) => ({
    subject: l.owner_first_name
      ? `Work done should mean paid, ${l.owner_first_name}`
      : `Work done should mean paid — ${l.name}`,
    paras: [
      `You know the worst invoice in this business: the one that comes back. Work's finished, parts are in, service delivered — and weeks later a dispute claws the money back, with a fee stacked on top.`,
      `I work with NectarPay here in the Valley. It's a counter terminal that takes crypto payments — zero processing fee, and the money settles to your own wallet in seconds. A settled payment is final: no dispute window, no clawbacks, no losing the work and the money.`,
      `Setup is an afternoon, and your card reader keeps working exactly like today. This is the final-payment lane beside it.`,
    ],
  }),
};

const E2_INTRO: Record<Cluster, string> = {
  control: `Quick follow-up — last time I mentioned nobody can freeze or reverse this lane. Here's the other half: what it saves.`,
  math: `Following up with the napkin math. Here's what $10K/month on cards looks like:`,
  crowd: `Following up — beyond the young crowd at your counter, here's what the fee side looks like:`,
  simple: `Following up with the math, since the setup story is only half of it:`,
};

const E3_LINE: Record<Cluster, string> = {
  control: `Either way, no hard feelings — but if processors ever squeeze you again, you'll wish this was already on the counter.`,
  math: `Either way — the fee math doesn't change, so the door's open whenever it makes sense.`,
  crowd: `Either way — first shop on the block still gets the bragging rights, and that window's open now.`,
  simple: `Either way — it's an afternoon to set up whenever you're ready.`,
};

// --- Renderers ---------------------------------------------------------------

const INTENTS: [string, string][] = [
  ["fees", "Cut my card fees"],
  ["control", "Nobody controls my money"],
  ["chargebacks", "Kill chargebacks"],
  ["curious", "Just curious"],
];

export function renderEmail(
  stage: 1 | 2 | 3,
  lead: TemplateLead,
  baseUrl: string,
  address: string,
  rep: Rep = DEFAULT_REP
): Rendered {
  const cluster = CLUSTER_MAP[lead.vertical] ?? "math";
  const b = buttons(baseUrl, lead.pulse_token, INTENTS);
  const f = footer(baseUrl, lead.pulse_token, address, rep);
  const napkinLink = pulse(baseUrl, lead.pulse_token, "fees");
  const g = greet(lead);

  if (stage === 1) {
    const { subject, paras } = E1[cluster](lead);
    const html = wrapHtml(
      `<p>${esc(g)}</p>` +
        paras.map((p) => `<p>${esc(p)}</p>`).join("") +
        b.html +
        `<p style="margin-top:14px">— ${esc(rep.first)}</p>` +
        f.html
    );
    const text = `${g}\n\n${paras.join("\n\n")}\n${b.text}\n\n— ${rep.first}${f.text}`;
    return { subject, html, text };
  }

  if (stage === 2) {
    const subject = lead.owner_first_name
      ? `The napkin math, ${lead.owner_first_name}`
      : `The napkin math for ${lead.name}`;
    const table =
      `<table style="border-collapse:collapse;margin:10px 0 4px;font-size:14px">` +
      `<tr><td style="padding:4px 14px 4px 0">Lost to card fees / year (~3%)</td><td style="color:#C8442C;font-weight:700">−$3,600</td></tr>` +
      `<tr><td style="padding:4px 14px 4px 0">NectarPay, year one — all in</td><td style="font-weight:700">$727</td></tr>` +
      `<tr><td style="padding:4px 14px 4px 0">Every year after</td><td style="font-weight:700">$228</td></tr>` +
      `</table>`;
    const tableText = `  Lost to card fees / year (~3%):  -$3,600\n  NectarPay, year one all-in:      $727\n  Every year after:                $228`;
    const html = wrapHtml(
      `<p>${esc(g)}</p>` +
        `<p>${esc(E2_INTRO[cluster])}</p>` +
        table +
        `<p style="font-size:13px;color:#47566B">That's the $10K/month example — your number's different, so I set up a page where you can slide your own volume:</p>` +
        `<p><a href="${napkinLink}" style="display:inline-block;padding:11px 18px;background:#0C1A2C;color:#F2A71B;border-radius:8px;text-decoration:none;font-weight:700">Slide your own numbers →</a></p>` +
        `<p>— ${esc(rep.first)}</p>` +
        f.html
    );
    const text = `${g}\n\n${E2_INTRO[cluster]}\n\n${tableText}\n\nYour number's different — slide your own volume here:\n${napkinLink}\n\n— ${rep.first}${f.text}`;
    return { subject, html, text };
  }

  // stage 3 — the either-way close
  const subject = `Working ${lead.city} next week either way`;
  const swing = pulse(baseUrl, lead.pulse_token, "visit");
  const close = pulse(baseUrl, lead.pulse_token, "optout");
  const html = wrapHtml(
    `<p>${esc(g)}</p>` +
      `<p>${esc(`I'll be working ${lead.city} next week either way — worth ten minutes at your counter to see a live payment settle, or should I close your file?`)}</p>` +
      `<p>` +
      `<a href="${swing}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;background:#0C1A2C;color:#F2A71B;border-radius:8px;text-decoration:none;font-weight:700">Swing by — pick a day</a>` +
      `<a href="${close}" style="display:inline-block;padding:11px 18px;border:1.5px solid #8a94a3;border-radius:8px;color:#47566B;text-decoration:none">Close my file</a>` +
      `</p>` +
      `<p>${esc(E3_LINE[CLUSTER_MAP[lead.vertical] ?? "math"])}</p>` +
      `<p>— ${esc(rep.first)}</p>` +
      f.html
  );
  const text = `${g}\n\nI'll be working ${lead.city} next week either way — worth ten minutes at your counter to see a live payment settle, or should I close your file?\n\nSwing by — pick a day: ${swing}\nClose my file: ${close}\n\n${E3_LINE[CLUSTER_MAP[lead.vertical] ?? "math"]}\n\n— ${rep.first}${f.text}`;
  return { subject, html, text };
}
