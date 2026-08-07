// Templates: 5 story clusters. Standard clusters run a 6-email arc,
// crypto-native runs a tighter 4. Text-forward — cold email should read
// like a person typed it, not like a designed newsletter.

export type Cluster = "control" | "math" | "crowd" | "simple" | "native";
export type Stage = 1 | 2 | 3 | 4 | 5 | 6;

/** Native is a tighter 4-email arc; standard clusters run 6. */
export function maxStageFor(cluster: Cluster): Stage {
  return cluster === "native" ? 4 : 6;
}

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
  "crypto-native": "native",
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
  native: (l) => ({
    subject: l.owner_first_name
      ? `You saw this coming, ${l.owner_first_name}`
      : `${l.name} saw this coming before the block did`,
    paras: [
      `Most shops in ${l.city} are still deciding whether crypto is real. You already take it — which tells me you did the homework years before your neighbors.`,
      `Here's what I keep seeing at shops that already take it, though: either a BitPay-style processor skimming 1–2% plus a quarter per transaction and settling to the bank in a day or two — card-fee economics on crypto rails — or a bare wallet QR taped by the register that's actually free, but clunky enough that the staff steer people away from it.`,
      `NectarPay is the third option: a real counter terminal — staff type the amount, customer scans, ten seconds — with zero processing fee and settlement straight to a wallet you control, instantly. Processor-grade checkout, DIY-grade economics. $499 once, $19 a month, flat — never a percentage.`,
      `It sits beside whatever you run today — worth ten minutes comparing it against your current rail.`,
    ],
  }),
};

const E2_INTRO: Record<Cluster, string> = {
  native: `unused — native e2 renders its own body`,
  control: `Quick follow-up — last time I mentioned nobody can freeze or reverse this lane. Here's the other half: what it saves.`,
  math: `Following up with the napkin math. Here's what $10K/month on cards looks like:`,
  crowd: `Following up — beyond the young crowd at your counter, here's what the fee side looks like:`,
  simple: `Following up with the math, since the setup story is only half of it:`,
};

// e3: the objection email — cluster-tuned "nothing changes" angle
const E3_ANGLE: Record<Cluster, string> = {
  native: ``,
  control: `This just adds a lane nobody can freeze or reverse — so the day a processor gets twitchy about your industry again, you already have money coming in that they can't touch.`,
  math: `This adds a lane where the 3% simply doesn't exist — every customer who uses it is pure margin back, on top of a setup you didn't have to change.`,
  crowd: `This adds the lane your youngest customers keep asking about — and that crowd tells each other which shops have it.`,
  simple: `This adds a lane where a settled payment is final — no disputes, no clawbacks. Work done means paid.`,
};

// Final-email sign-off line per cluster
const E3_LINE: Record<Cluster, string> = {
  native: `Either way — you were early, and that's worth something on the map we're building.`,
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
  stage: Stage,
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

  if (stage === 2 && cluster === "native") {
    const subject = lead.owner_first_name
      ? `Early shops anchor the map, ${lead.owner_first_name}`
      : `Early shops anchor the map`;
    const html = wrapHtml(
      `<p>${esc(g)}</p>` +
        `<p>${esc(`One more thing being early earns you: NectarPay is building a merchant directory — crypto holders nearby see the shops that take it and head for the door. The first listed shops anchor the map for their whole neighborhood.`)}</p>` +
        `<p>${esc(`Between zero-fee processing and the listing, it's worth putting your setup side by side with ours:`)}</p>` +
        `<p><a href="${napkinLink}" style="display:inline-block;padding:11px 18px;background:#0C1A2C;color:#F2A71B;border-radius:8px;text-decoration:none;font-weight:700">Compare it on your numbers &rarr;</a></p>` +
        `<p>— ${esc(rep.first)}</p>` +
        f.html
    );
    const text = `${g}\n\nOne more thing being early earns you: NectarPay is building a merchant directory — crypto holders nearby see the shops that take it and head for the door. The first listed shops anchor the map for their whole neighborhood.\n\nWorth putting your setup side by side with ours:\n${napkinLink}\n\n— ${rep.first}${f.text}`;
    return { subject, html, text };
  }

  if (stage === 2) {
    const subject = lead.owner_first_name
      ? `The napkin math, ${lead.owner_first_name}`
      : `The napkin math for ${lead.name}`;
    const table =
      `<table style="border-collapse:collapse;margin:10px 0 4px;font-size:14px">` +
      `<tr><td style="padding:4px 14px 4px 0">Lost to card fees / year (~3%)</td><td style="color:#C8442C;font-weight:700">&minus;$3,600</td></tr>` +
      `<tr><td style="padding:4px 14px 4px 0">NectarPay, year one — all in</td><td style="font-weight:700">$727</td></tr>` +
      `<tr><td style="padding:4px 14px 4px 0">Every year after</td><td style="font-weight:700">$228</td></tr>` +
      `</table>`;
    const tableText = `  Lost to card fees / year (~3%):  -$3,600\n  NectarPay, year one all-in:      $727\n  Every year after:                $228`;
    const html = wrapHtml(
      `<p>${esc(g)}</p>` +
        `<p>${esc(E2_INTRO[cluster])}</p>` +
        table +
        `<p style="font-size:13px;color:#47566B">That's the $10K/month example — your number's different, so I set up a page where you can slide your own volume:</p>` +
        `<p><a href="${napkinLink}" style="display:inline-block;padding:11px 18px;background:#0C1A2C;color:#F2A71B;border-radius:8px;text-decoration:none;font-weight:700">Slide your own numbers &rarr;</a></p>` +
        `<p>— ${esc(rep.first)}</p>` +
        f.html
    );
    const text = `${g}\n\n${E2_INTRO[cluster]}\n\n${tableText}\n\nYour number's different — slide your own volume here:\n${napkinLink}\n\n— ${rep.first}${f.text}`;
    return { subject, html, text };
  }

  if (stage === 3 && cluster === "native") {
    const subject = lead.owner_first_name
      ? `Run both rails for a month, ${lead.owner_first_name}?`
      : `Run both rails for a month`;
    const visit = pulse(baseUrl, lead.pulse_token, "visit");
    const html = wrapHtml(
      `<p>${esc(g)}</p>` +
        `<p>${esc(`Simplest way to settle it: keep whatever you run today exactly as is, put our terminal beside it for a month, and compare the tape — fees taken, time to money, and how often the staff actually reach for each one.`)}</p>` +
        `<p>${esc(`Setup is one afternoon. If ours doesn't win on your own numbers, I'll carry it back out myself.`)}</p>` +
        `<p><a href="${visit}" style="display:inline-block;padding:11px 18px;background:#0C1A2C;color:#F2A71B;border-radius:8px;text-decoration:none;font-weight:700">Set it up — pick a day &rarr;</a></p>` +
        `<p>— ${esc(rep.first)}</p>` +
        f.html
    );
    const text = `${g}\n\nSimplest way to settle it: keep whatever you run today exactly as is, put our terminal beside it for a month, and compare the tape — fees taken, time to money, and how often the staff actually reach for each one.\n\nSetup is one afternoon. If ours doesn't win on your own numbers, I'll carry it back out myself.\n\nSet it up — pick a day: ${visit}\n\n— ${rep.first}${f.text}`;
    return { subject, html, text };
  }

  if (stage === 3) {
    const subject = lead.owner_first_name
      ? `The question every owner asks me, ${lead.owner_first_name}`
      : `The question every owner asks me`;
    const html = wrapHtml(
      `<p>${esc(g)}</p>` +
        `<p>${esc(`"But my customers pay with cards." Every owner says it — and it's exactly right. That's why nothing about your card setup changes. Same reader, same flow, same everything.`)}</p>` +
        `<p>${esc(E3_ANGLE[cluster])}</p>` +
        `<p>${esc(`Worth being ready before the first customer asks. Or the tenth.`)}</p>` +
        b.html +
        `<p style="margin-top:14px">— ${esc(rep.first)}</p>` +
        f.html
    );
    const text = `${g}\n\n"But my customers pay with cards." Every owner says it — and it's exactly right. That's why nothing about your card setup changes. Same reader, same flow, same everything.\n\n${E3_ANGLE[cluster]}\n\nWorth being ready before the first customer asks. Or the tenth.\n${b.text}\n\n— ${rep.first}${f.text}`;
    return { subject, html, text };
  }

  if (stage === 4 && cluster !== "native") {
    const subject = `${lead.city} is quietly moving on this`;
    const curious = pulse(baseUrl, lead.pulse_token, "curious");
    const html = wrapHtml(
      `<p>${esc(g)}</p>` +
        `<p>${esc(`Roughly one in five U.S. small businesses now takes crypto — up from about one in seven a year ago. It stops being a novelty the moment one shop on the block has the sticker and the rest don't.`)}</p>` +
        `<p>${esc(`We're working ${lead.city} right now, and the map is filling in faster than most owners expect. First shop on a block gets the bragging rights — and the customers who go looking.`)}</p>` +
        `<p><a href="${curious}" style="display:inline-block;padding:11px 18px;background:#0C1A2C;color:#F2A71B;border-radius:8px;text-decoration:none;font-weight:700">See where your block stands &rarr;</a></p>` +
        `<p>— ${esc(rep.first)}</p>` +
        f.html
    );
    const text = `${g}\n\nRoughly one in five U.S. small businesses now takes crypto — up from about one in seven a year ago. It stops being a novelty the moment one shop on the block has the sticker and the rest don't.\n\nWe're working ${lead.city} right now, and the map is filling in faster than most owners expect. First shop on a block gets the bragging rights — and the customers who go looking.\n\nSee where your block stands: ${curious}\n\n— ${rep.first}${f.text}`;
    return { subject, html, text };
  }

  if (stage === 5) {
    const subject = `The part nobody mentions: new customers`;
    const curious = pulse(baseUrl, lead.pulse_token, "curious");
    const html = wrapHtml(
      `<p>${esc(g)}</p>` +
        `<p>${esc(`Everything I've sent so far is about keeping money you already earn. Here's the other half: crypto holders actively look for places to spend — and NectarPay is building a merchant directory that points them at the shops that take it.`)}</p>` +
        `<p>${esc(`The terminal handles the payments today. The listing brings the door swings tomorrow — and early shops anchor their neighborhood on that map.`)}</p>` +
        `<p><a href="${curious}" style="display:inline-block;padding:11px 18px;background:#0C1A2C;color:#F2A71B;border-radius:8px;text-decoration:none;font-weight:700">Get on the map early &rarr;</a></p>` +
        `<p>— ${esc(rep.first)}</p>` +
        f.html
    );
    const text = `${g}\n\nEverything I've sent so far is about keeping money you already earn. Here's the other half: crypto holders actively look for places to spend — and NectarPay is building a merchant directory that points them at the shops that take it.\n\nThe terminal handles the payments today. The listing brings the door swings tomorrow — and early shops anchor their neighborhood on that map.\n\nGet on the map early: ${curious}\n\n— ${rep.first}${f.text}`;
    return { subject, html, text };
  }

  // Final stage — the either-way close (stage 6 standard, stage 4 native)
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
      `<p>${esc(E3_LINE[cluster])}</p>` +
      `<p>— ${esc(rep.first)}</p>` +
      f.html
  );
  const text = `${g}\n\nI'll be working ${lead.city} next week either way — worth ten minutes at your counter to see a live payment settle, or should I close your file?\n\nSwing by — pick a day: ${swing}\nClose my file: ${close}\n\n${E3_LINE[cluster]}\n\n— ${rep.first}${f.text}`;
  return { subject, html, text };
}
