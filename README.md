# NectarPay Campaigns

Outbound engine: 3-email sequences (4 story clusters), warm-up ramp,
CRM-driven suppression, Pulse links in every send.

## Setup
1. Run sql/021_campaign-columns.sql on the nectarpay project (psql)
2. Copy .env.example -> .env, fill: RESEND_API_KEY, Supabase, PHYSICAL_ADDRESS
3. Set config/campaign.json -> campaignStart to your real first send date

## Daily rhythm
- npm run send:dry            # see today's plan (cap, mix, exclusions)
- npm run send                # send it (700ms between sends)
- npm run send:test you@x     # 12 samples (4 clusters x 3 stages) to your inbox
- npm run report              # pipeline + recent hard engagement

## Rules the engine enforces
- Ramp: 30/day wk1 -> 60 -> 120 -> 250 (config/campaign.json)
- Only status NEW gets email 1; only EMAILED continues the sequence.
  VISITED/MEETING/CLOSED/DNC are untouchable (Eric's field statuses win)
- Any hard Pulse engagement (non-view event) exits the lead from the
  sequence permanently — they're Eric's now
- Follow-ups send before fresh email-1s; email 2 at +4 days, email 3 at +5
- Named + highest-score leads go first (replies build domain reputation)
- Every send flips status -> EMAILED (contact lifecycle advances to
  'working' via the existing sync trigger)
