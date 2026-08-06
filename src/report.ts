import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

function need(name: string): string {
  const v = process.env[name];
  if (!v) { console.error(`Missing ${name}`); process.exit(1); }
  return v;
}

async function main() {
  const supabase = createClient(need("SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"));

  const { data: stages } = await supabase.rpc("campaign_report").select();
  if (stages) { console.table(stages); return; }

  // Fallback without RPC: three quick counts
  const count = async (q: (b: any) => any) => {
    const { count: c } = await q(
      supabase.from("nectarpay_leads").select("place_id", { count: "exact", head: true })
    );
    return c ?? 0;
  };
  console.log("Sendable (NEW, has email):", await count((b: any) => b.eq("status", "NEW").eq("email_stage", 0).neq("emails", "{}")));
  console.log("In sequence (stage 1):    ", await count((b: any) => b.eq("email_stage", 1)));
  console.log("In sequence (stage 2):    ", await count((b: any) => b.eq("email_stage", 2)));
  console.log("Completed (stage 3):      ", await count((b: any) => b.eq("email_stage", 3)));
  console.log("Engaged (any):            ", await count((b: any) => b.not("first_engaged_at", "is", null)));
  console.log("DNC:                      ", await count((b: any) => b.eq("status", "DO_NOT_CONTACT")));

  const { data: recent } = await supabase
    .from("engagement_events")
    .select("event, intent, value_text, value_num, created_at, place_id")
    .neq("event", "view")
    .order("created_at", { ascending: false })
    .limit(15);
  console.log("\nRecent hard engagement:");
  console.table(recent ?? []);
}

main().catch((e) => { console.error(e); process.exit(1); });
