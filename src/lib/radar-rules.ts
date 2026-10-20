import { CATALOG, type CatalogOpp, type Requirement } from "@/lib/opportunity-catalog";

// Fact-based assessment rules for the Ocean Opportunity Radar demo.
// Only analyst-confirmed facts influence any number. Every number carries the
// facts that produced it, so the UI can explain it.

export type FactType = "paid_pilot" | "technical_test" | "customer_interest" | "ocean_impact" | "other";

export const FACT_TYPE_LABELS: Record<FactType, string> = {
  paid_pilot: "Paid pilot / paying customer",
  technical_test: "Technical test result",
  customer_interest: "Customer interest (LOI, interview)",
  ocean_impact: "Ocean impact measurement",
  other: "Other (no rule yet)",
};

export type Fact = {
  id: string;
  text: string;
  type: FactType;
  source: string;
  confirmed: boolean;
  demo: boolean;
  userAdded?: boolean;
  origin?: "manual" | "ai" | "sample" | undefined;
  sourceTitle?: string;
  verificationSource?: string | undefined;
  sourceExcerpt?: string | undefined;
  sourceText?: string;
  verificationNeed?: string | undefined;
  evidenceDate?: string; // when the evidence was produced
  checkedDate?: string; // when the analyst checked it
  trl?: number | undefined; // TRL 1–9 chosen by the analyst from the evidence; never inferred from text
  // Ocean impact parts. "Measured" needs result, unit, period or baseline, and a source.
  impactResult?: string | undefined;
  impactUnit?: string | undefined;
  impactPeriod?: string | undefined;
  impactBaseline?: string | undefined;
};

export type Startup = {
  demo?: boolean;
  id: string;
  name: string;
  tagline: string;
  // Demo profile (fictional) used for topic, stage and geography checks.
  country: string;
  stage: string;
  focusAreas: string[];
  canAttendHelsinki: "yes" | "no" | "unknown"; // not established = "unknown"
  facts: Fact[];
  pilotAction: string;
  suggestedPilot: string;
};

export type Reason = { factId?: string; text: string };
export type Metric = { value: number | null; max: number; summary: string; reasons: Reason[] };
export type ChecklistItem = { label: string; met: boolean; factIds: string[] };

export type CheckResult = "met" | "not_met" | "unknown";
export type RequirementCheck = { label: string; result: CheckResult; quote: string; detail: string };
export type RankReason = { factor: "Topic" | "Stage" | "Geography" | "Current need" | "Evidence"; points: number; text: string; factId?: string | undefined };

export type OppMatch = {
  opp: CatalogOpp;
  eligibility: "eligible" | "needs_verification" | "excluded";
  checks: RequirementCheck[];
  actionable: boolean;
  statusLabel: string;
  action: string;
  score: number;
  reasons: RankReason[];
  supportingFactIds: string[];
  analystPrefs: { label: string; met: boolean }[];
};

export type Assessment = {
  trl: Metric;
  brl: Metric;
  irl: Metric & { checklist: ChecklistItem[] };
  oceanImpact: { value: string; measured: boolean; reasons: Reason[] };
  hasPaidPilot: boolean;
  effects: Record<string, string[]>;
  action: string;
  actionWhy: string;
  path: {
    evidence: string;
    evidenceFactIds: string[]; // facts that actually drive the top recommendation
    reason: string;
    opportunity: string;
    missing: string;
    next: string;
  };
  opps: OppMatch[]; // actionable and not excluded, ranked
  notNow: OppMatch[]; // closed or failing a published requirement
};

/** A technical test only counts with an analyst-chosen whole TRL between 1 and 9. */
export const validTrl = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 9;
export const TRL_INCOMPLETE = "Saved — no valid TRL (1–9) chosen, TRL unchanged";
export const BRL_UNKNOWN_NOTE = "Simplified internal estimate of this prototype, not an official scale";

export const NO_CHANGE = "Recorded, no assessment change";
export const MEASUREMENT_NEEDED = "Measurement needed";

export function confirmationError(d: { confirmed: boolean; source: string; origin?: string | undefined; verificationSource?: string | undefined }): string | null {
  if (d.confirmed && (d.origin === "ai" || d.origin === "sample") && !d.verificationSource?.trim()) return "Describe the supporting evidence you inspected. The original application quote alone is not verification.";
  if (d.confirmed && !d.source.trim()) return "Add a source description or URL before marking as analyst-confirmed.";
  return null;
}

/** Missing parts of an ocean-impact claim; empty array = measured. */
export function impactGaps(f: Fact): string[] {
  const gaps: string[] = [];
  if (!f.impactResult?.trim()) gaps.push("result");
  if (!f.impactUnit?.trim()) gaps.push("unit");
  if (!f.impactPeriod?.trim() && !f.impactBaseline?.trim()) gaps.push("period or baseline");
  if (!f.source.trim()) gaps.push("source");
  return gaps;
}

export const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const todayIso = () => new Date().toISOString().slice(0, 10);

function checkRequirement(r: Requirement, st: Startup, trl: number | null): RequirementCheck {
  const base = { label: r.label, quote: r.quote };
  const profile = st.demo === false ? "analyst-entered profile" : "demo profile";
  switch (r.kind) {
    case "geography":
      if (r.countries.includes(st.country)) return { ...base, result: "met", detail: `${st.country} (${profile}) is covered` };
      return r.outside === "not_met"
        ? { ...base, result: "not_met", detail: `${st.country} (${profile}) is outside the required geography` }
        : { ...base, result: "unknown", detail: `${st.country} is not on our checked country list — verify with source` };
    case "min_trl":
      if (trl === null) return { ...base, result: "unknown", detail: "TRL unknown — no confirmed technical test" };
      return trl >= r.min
        ? { ...base, result: "met", detail: `Confirmed TRL ${trl}` }
        : { ...base, result: "not_met", detail: `Confirmed TRL ${trl} is below ${r.min}` };
    case "stage":
      if (st.stage === "Unknown") return { ...base, result: "unknown", detail: "Company stage is not established yet" };
      return r.stages.includes(st.stage)
        ? { ...base, result: "met", detail: `${st.stage} (${profile})` }
        : { ...base, result: "not_met", detail: `${st.stage} (${profile}) is outside the published stage range` };
    case "attend_helsinki":
      return st.canAttendHelsinki === "yes"
        ? { ...base, result: "met", detail: `Can attend in Helsinki: yes (${profile})` }
        : st.canAttendHelsinki === "no"
          ? { ...base, result: "not_met", detail: `Can attend in Helsinki: no (${profile}) — onsite participation is required` }
          : { ...base, result: "unknown", detail: "Can attend in Helsinki: unknown — not yet established with the startup" };
    case "unknown":
      return { ...base, result: "unknown", detail: "Eligibility information missing — verify with source before applying" };
  }
}

export function matchOpportunity(
  o: CatalogOpp,
  st: Startup,
  ctx: { trl: number | null; trlFactId?: string | undefined; pilotId?: string | undefined; asOf: string },
): OppMatch {
  const hasPilot = !!ctx.pilotId;
  const checks = o.hardRequirements.map((r) => checkRequirement(r, st, ctx.trl));
  const eligibility = checks.some((c) => c.result === "not_met")
    ? "excluded"
    : checks.some((c) => c.result === "unknown")
      ? "needs_verification"
      : "eligible";

  const closed = o.status === "closed" || (!!o.deadline && o.deadline < ctx.asOf);
  const actionable = !closed;
  const statusLabel = closed
    ? "Closed"
    : o.status === "open"
      ? `Open${o.deadline ? ` · deadline ${fmtDate(o.deadline)}` : " · deadline unknown"}`
      : o.status === "rolling"
        ? "Rolling submission"
        : "Status unknown";

  let action: string;
  if (closed) action = "Closed — do not apply; watch the source for a new round";
  else if (eligibility === "excluded") action = `Not eligible: ${checks.find((c) => c.result === "not_met")!.detail}`;
  else if (eligibility === "needs_verification")
    action = `Verify eligibility first: ${checks.filter((c) => c.result === "unknown").map((c) => c.label).join("; ")}`;
  else if (o.status === "unknown") action = "Check the official contact route before requesting an introduction";
  else {
    action = o.status === "rolling" ? "Prepare a short proposal (rolling)" : o.deadline ? `Apply before ${fmtDate(o.deadline)}` : "Apply — deadline unknown, check source";
  }

  // Ranking — every point has a visible reason.
  const reasons: RankReason[] = [];
  const anyField = o.focusAreas.includes("Any");
  const topic = o.focusAreas.filter((a) => st.focusAreas.includes(a) || (a === "Blue economy" && st.focusAreas.some((f) => f !== "Unknown")));
  if (topic.length) reasons.push({ factor: "Topic", points: 2, text: `Matches focus: ${topic.join(", ")}` });
  else if (anyField) reasons.push({ factor: "Topic", points: 1, text: "Open to any field — no specific ocean focus" });

  const stageCheck = checks.find((c) => o.hardRequirements[checks.indexOf(c)]?.kind === "stage");
  if (stageCheck?.result === "met") reasons.push({ factor: "Stage", points: 1, text: `Stage ${st.stage} is in ${o.stage}` });
  const trlCheck = o.hardRequirements.findIndex((r) => r.kind === "min_trl");
  if (trlCheck >= 0 && checks[trlCheck]!.result === "met")
    reasons.push({ factor: "Stage", points: 1, text: `${checks[trlCheck]!.detail} fits ${o.stage}`, factId: ctx.trlFactId });
  if (o.publishedPreferences.some((p) => p.includes("MVP")))
    reasons.push(
      hasPilot
        ? { factor: "Stage", points: 1, text: "Paying pilot suggests a solution in market (published preference)", factId: ctx.pilotId }
        : { factor: "Stage", points: 0, text: "No confirmed solution in market yet (published preference, not a requirement)" },
    );

  const geo = checks.find((_, i) => o.hardRequirements[i]!.kind === "geography");
  if (geo?.result === "met") reasons.push({ factor: "Geography", points: 1, text: geo.detail });
  else reasons.push({ factor: "Geography", points: 0, text: geo ? geo.detail : `Geography: ${o.geography}` });

  if (!hasPilot && o.supportsPiloting)
    reasons.push({ factor: "Current need", points: 2, text: "Current gap is customer proof; source offers piloting support" });
  if (hasPilot && o.investor)
    reasons.push({ factor: "Current need", points: 2, text: "Customer proof exists; next need is investment", factId: ctx.pilotId });

  const analystPrefs = o.analystPreferences.map((p) => ({ label: p.label, met: p.needs === "paid_pilot" ? hasPilot : false }));
  for (const p of analystPrefs)
    reasons.push({
      factor: "Evidence",
      points: p.met ? 1 : -1,
      text: `${p.met ? "Meets" : "Misses"} analyst preference: ${p.label}`,
      factId: p.met ? ctx.pilotId : undefined,
    });

  const supportingFactIds = [...new Set(reasons.map((r) => r.factId).filter((x): x is string => !!x))];
  return {
    opp: o,
    eligibility,
    checks,
    actionable,
    statusLabel,
    action,
    score: reasons.reduce((n, r) => n + r.points, 0),
    reasons,
    supportingFactIds,
    analystPrefs,
  };
}

export const KIND_LABEL: Record<CatalogOpp["kind"], string> = { accelerator: "accelerator", investor: "investor", grant: "EU funding" };

/** Best next action, worded for the recommended opportunity and its type. */
export function nextAction(m: OppMatch): string {
  const n = m.opp.name;
  if (m.eligibility === "needs_verification")
    return `Verify eligibility for ${n} first: ${m.checks.filter((c) => c.result === "unknown").map((c) => c.label.charAt(0).toLowerCase() + c.label.slice(1)).join("; ")}`;
  switch (m.opp.kind) {
    case "investor":
      return m.opp.status === "unknown"
        ? `Check ${n}'s official contact route before requesting an introduction`
        : `Prepare an investor brief for ${n}`;
    case "accelerator":
      return m.opp.deadline ? `Prepare the ${n} application before ${fmtDate(m.opp.deadline)}` : `Prepare the ${n} application`;
    case "grant":
      return m.opp.status === "rolling" ? `Prepare a ${n} short proposal (rolling submission)` : `Prepare the ${n} proposal`;
  }
}

/** First obstacle for the top opportunity — published unknowns first, never our checklist dressed up as theirs. */
export function topObstacle(m: OppMatch, checklistGaps: string[]): string {
  const n = m.opp.name;
  const unknown = m.checks.filter((c) => c.result === "unknown");
  if (unknown.length) return `${unknown[0]!.detail} (published requirement of ${n})`;
  if (m.opp.status === "unknown")
    return `${n}'s contact / introduction route is not established in its official source — check it before any introduction`;
  const prefs = m.analystPrefs.filter((p) => !p.met);
  if (prefs.length) return `Our analyst preference, not published by ${n}: ${prefs.map((p) => p.label).join("; ")}`;
  return checklistGaps.length
    ? `Stored checks passed for ${n}; review the full official conditions. App's own checklist gaps (not ${n} requirements): ${checklistGaps.join("; ")}`
    : `Stored checks passed for ${n}; review the full official conditions`;
}

export function assess(
  startup: Startup,
  extra: Fact[] = [],
  opts: { asOf?: string; catalog?: CatalogOpp[] } = {},
): Assessment {
  const asOf = opts.asOf ?? todayIso();
  const catalog = opts.catalog ?? CATALOG;
  const confirmed = [...startup.facts, ...extra].filter((f) => f.confirmed && !confirmationError(f));
  const effects: Record<string, string[]> = {};
  const note = (f: Fact, e: string) => (effects[f.id] ??= []).push(e);
  for (const f of confirmed) effects[f.id] = [];

  // Technology readiness: highest level shown by a confirmed technical test, otherwise unknown.
  const tech = confirmed.filter((f) => f.type === "technical_test" && validTrl(f.trl));
  confirmed.filter((f) => f.type === "technical_test" && !validTrl(f.trl)).forEach((f) => note(f, TRL_INCOMPLETE));
  const trlValue = tech.length ? Math.max(...tech.map((f) => f.trl!)) : null;
  tech.forEach((f) => note(f, `Shows TRL ${f.trl}`));
  const trl: Metric = {
    value: trlValue,
    max: 9,
    summary: tech.length ? "Highest level shown by confirmed technical tests" : "No confirmed technical test — TRL unknown",
    reasons: tech.map((f) => ({ factId: f.id, text: `${f.text} → TRL ${f.trl}` })),
  };

  const interest = confirmed.filter((f) => f.type === "customer_interest");
  const pilots = confirmed.filter((f) => f.type === "paid_pilot");
  const hasPaidPilot = pilots.length > 0;
  // Simplified internal estimate: no customer evidence = unknown, never a default number.
  const brlValue = hasPaidPilot ? 5 : interest.length ? 4 : null;
  interest.forEach((f) => note(f, "Supports BRL 4 (demand indicated)"));
  pilots.forEach((f) => note(f, "Raises BRL to 5 (paying customer)"));
  const brl: Metric = {
    value: brlValue,
    max: 9,
    summary: hasPaidPilot
      ? "Paying customer confirmed"
      : interest.length
        ? "Demand indicated, no paying customer yet"
        : "No confirmed customer evidence — BRL unknown",
    reasons: [
      ...interest.map((f) => ({ factId: f.id, text: `${f.text} → BRL 4` })),
      ...pilots.map((f) => ({ factId: f.id, text: `${f.text} → BRL 5` })),
    ],
  };

  // Ocean impact: only complete measurements count.
  const impactFacts = confirmed.filter((f) => f.type === "ocean_impact");
  const measured = impactFacts.filter((f) => impactGaps(f).length === 0);
  const impactReasons: Reason[] = [];
  for (const f of impactFacts) {
    const gaps = impactGaps(f);
    if (gaps.length) {
      note(f, `Unsupported impact claim — missing ${gaps.join(", ")}`);
      impactReasons.push({ factId: f.id, text: `${f.text} — not counted: missing ${gaps.join(", ")}` });
    } else {
      note(f, "Sets measured ocean impact");
      impactReasons.push({
        factId: f.id,
        text: `${f.impactResult} ${f.impactUnit} · ${[f.impactPeriod, f.impactBaseline && `baseline ${f.impactBaseline}`].filter(Boolean).join(" · ")} · Source: ${f.source}`,
      });
    }
  }
  const oceanImpact = {
    value: measured.length ? measured.map((f) => `${f.impactResult} ${f.impactUnit}`).join("; ") : MEASUREMENT_NEEDED,
    measured: measured.length > 0,
    reasons: impactReasons,
  };

  const checklist: ChecklistItem[] = [
    { label: "Technology at TRL 6 or higher", met: (trlValue ?? 0) >= 6, factIds: tech.filter((f) => f.trl! >= 6).map((f) => f.id) },
    { label: "Confirmed customer interest", met: interest.length > 0 || hasPaidPilot, factIds: [...interest, ...pilots].map((f) => f.id) },
    { label: "Confirmed paid pilot", met: hasPaidPilot, factIds: pilots.map((f) => f.id) },
    { label: "Measured ocean impact", met: measured.length > 0, factIds: measured.map((f) => f.id) },
  ];
  for (const c of checklist) for (const id of c.factIds) effects[id]?.push(`Ticks checklist: ${c.label}`);
  const met = checklist.filter((c) => c.met);
  const irl = {
    value: met.length,
    max: checklist.length,
    summary: `${met.length} of ${checklist.length} checklist items met`,
    reasons: checklist.map((c) => ({ text: `${c.met ? "✓" : "✗"} ${c.label}` })),
    checklist,
  };

  for (const id of Object.keys(effects)) if (effects[id]!.length === 0) effects[id]!.push(NO_CHANGE);

  const topTech = tech.find((f) => f.trl === trlValue);
  const matches = catalog.map((o) =>
    matchOpportunity(o, startup, { trl: trlValue, trlFactId: topTech?.id, pilotId: pilots[0]?.id, asOf }),
  );
  const opps = matches.filter((m) => m.actionable && m.eligibility !== "excluded").sort((a, b) => b.score - a.score);
  const notNow = matches.filter((m) => !m.actionable || m.eligibility === "excluded");

  const top = opps[0];
  const missing = checklist.filter((c) => !c.met).map((c) => c.label);
  const action = top ? nextAction(top) : startup.pilotAction;
  // Evidence step: facts behind the top recommendation first, newest analyst-added first.
  const changing = confirmed.filter((f) => effects[f.id]!.some((e) => e !== NO_CHANGE && e !== TRL_INCOMPLETE));
  const newestFirst = [...changing].sort((a, b) => Number(!!b.userAdded) - Number(!!a.userAdded));
  const driving = (top?.supportingFactIds ?? []).filter((id) => changing.some((f) => f.id === id));
  const evidenceIds = [...new Set([...driving, ...newestFirst.map((f) => f.id)])].slice(0, 2);

  return {
    trl,
    brl,
    irl,
    oceanImpact,
    hasPaidPilot,
    effects,
    action,
    actionWhy: `${top ? `Top-ranked: ${top.opp.name} (${KIND_LABEL[top.opp.kind]}). ` : ""}${
      hasPaidPilot ? "A paying customer is confirmed." : `No customer has paid yet — also: ${startup.pilotAction.toLowerCase()}.`
    }`,
    path: {
      evidence: evidenceIds.length ? evidenceIds.map((id) => confirmed.find((f) => f.id === id)!.text).join("; ") : "No confirmed facts yet",
      evidenceFactIds: evidenceIds,
      reason: `${trlValue === null ? "TRL unknown" : `TRL ${trlValue}`}, ${brl.value === null ? "BRL unknown" : `BRL ${brl.value}`} — ${brl.summary.toLowerCase()}`,
      opportunity: top ? `${top.opp.name} — ${top.action}` : "No actionable opportunity",
      missing: top ? topObstacle(top, missing) : missing.length ? `App's own checklist gaps: ${missing.join("; ")}` : "Nothing on the checklist",
      next: action,
    },
    opps,
    notNow,
  };
}

const d = (id: string, rest: Omit<Fact, "id" | "demo" | "confirmed">): Fact => ({ id, demo: true, confirmed: true, ...rest });

export const STARTUPS: Startup[] = [
  {
    id: "baltic-nutriloop",
    country: "Estonia",
    stage: "Seed",
    focusAreas: ["Blue Biotech & Water Innovation"],
    canAttendHelsinki: "unknown",
    name: "Baltic Nutriloop",
    tagline: "Recovers nutrients from side streams and turns them into marine-safe fertilisers.",
    facts: [
      d("bn1", { text: "Pilot-scale nutrient recovery unit operated for 6 months", type: "technical_test", source: "Site visit report (demo)", trl: 6, evidenceDate: "2026-04-30", checkedDate: "2026-05-12" }),
      d("bn2", { text: "Fertiliser samples passed independent lab nutrient analysis", type: "technical_test", source: "Lab certificate (demo)", trl: 6, evidenceDate: "2026-06-03", checkedDate: "2026-06-10" }),
      d("bn3", { text: "Two letters of intent from coastal farming cooperatives", type: "customer_interest", source: "Signed documents (demo)", evidenceDate: "2026-07-15", checkedDate: "2026-07-20" }),
    ],
    pilotAction: "Verify a paid pilot with a municipal or industrial partner",
    suggestedPilot: "Paid pilot signed with a municipal water utility",
  },
  {
    id: "kelpform",
    country: "Finland",
    stage: "Pre-seed",
    focusAreas: ["Blue Biotech & Water Innovation"],
    canAttendHelsinki: "yes",
    name: "KelpForm Packaging",
    tagline: "Seaweed-based films replacing single-use plastic in food packaging.",
    facts: [
      d("kf1", { text: "Lab-scale seaweed film production tested for tensile strength", type: "technical_test", source: "University lab report (demo)", trl: 5, evidenceDate: "2026-03-18", checkedDate: "2026-04-02" }),
      d("kf2", { text: "Twelve discovery interviews with food retailers", type: "customer_interest", source: "Interview notes (demo)", evidenceDate: "2026-05-05", checkedDate: "2026-05-09" }),
      d("kf3", { text: "Operations lead joined from the packaging industry", type: "other", source: "Team page and CV (demo)", evidenceDate: "2026-06-01", checkedDate: "2026-06-04" }),
    ],
    pilotAction: "Secure a paid packaging trial with a food retailer",
    suggestedPilot: "Paid packaging trial agreed with a regional grocery chain",
  },
  {
    id: "netsense",
    country: "Norway",
    stage: "Seed",
    focusAreas: ["Marine Intelligence"],
    canAttendHelsinki: "no",
    name: "NetSense Recovery",
    tagline: "Sensor tags that locate lost fishing nets so they can be recovered.",
    facts: [
      d("ns1", { text: "Sensor tags deployed on 40 nets for 3 months at sea", type: "technical_test", source: "Field trial log (demo)", trl: 7, evidenceDate: "2026-02-28", checkedDate: "2026-03-10" }),
      d("ns2", { text: "14 lost nets located and recovered during the field trial", type: "ocean_impact", source: "Recovery records (demo)", impactResult: "14", impactUnit: "lost nets located and recovered", impactPeriod: "Dec 2025 – Feb 2026 field trial", evidenceDate: "2026-02-28", checkedDate: "2026-03-10" }),
    ],
    pilotAction: "Confirm a paying fishing fleet for a tagging pilot",
    suggestedPilot: "Paid tagging pilot with a fishing cooperative fleet",
  },
];

export const getStartup = (id: string): Startup => STARTUPS.find((s) => s.id === id) ?? STARTUPS[0]!;

// ---------- Before/after comparison (drives the "Decision changed" panel) ----------

export type ChangeRow = { label: string; before: string; after: string; changed: boolean };
export type OppShift = {
  id: string;
  name: string;
  beforeRank: number | null; // null = not ranked (excluded / closed)
  afterRank: number | null;
  beforeEligibility: OppMatch["eligibility"];
  afterEligibility: OppMatch["eligibility"];
  checkChanges: string[]; // e.g. "Innovation at TRL 6 or higher: not_met → met"
};
export type Comparison = {
  rows: ChangeRow[];
  oppShifts: OppShift[]; // only opportunities whose rank, eligibility or checks changed
  changingFactIds: string[]; // new facts that changed something
  inertFacts: { id: string; why: string }[]; // new facts that changed nothing, with the reason
  anyChange: boolean;
  decisionChanged: boolean; // top opportunity or next action changed
  summary: string;
};

const trlStr = (v: number | null) => (v === null ? "TRL unknown" : `TRL ${v}`);
const brlStr = (v: number | null) => (v === null ? "BRL unknown" : `BRL ${v}`);
const ELIG = { eligible: "eligible", needs_verification: "eligibility to verify", excluded: "excluded" } as const;

export function compareAssessments(before: Assessment, after: Assessment, added: Fact[]): Comparison {
  const row = (label: string, b: string, a: string): ChangeRow => ({ label, before: b, after: a, changed: a !== b });
  const rows = [
    row("Technology readiness", trlStr(before.trl.value), trlStr(after.trl.value)),
    row("Business readiness", brlStr(before.brl.value), brlStr(after.brl.value)),
    row("Investor checklist (app's own)", `${before.irl.value}/${before.irl.max}`, `${after.irl.value}/${after.irl.max}`),
    row("Measured ocean impact", before.oceanImpact.value, after.oceanImpact.value),
    row("Top opportunity", before.opps[0]?.opp.name ?? "None", after.opps[0]?.opp.name ?? "None"),
    row("Next action", before.action, after.action),
  ];

  const all = (x: Assessment) => [...x.opps, ...x.notNow];
  const rank = (x: Assessment, id: string) => {
    const i = x.opps.findIndex((m) => m.opp.id === id);
    return i < 0 ? null : i + 1;
  };
  const oppShifts: OppShift[] = [];
  for (const b of all(before)) {
    const a = all(after).find((m) => m.opp.id === b.opp.id)!;
    const checkChanges = a.checks
      .map((c, i) => ({ c, old: b.checks[i]! }))
      .filter(({ c, old }) => c.result !== old.result)
      .map(({ c, old }) => `${c.label}: ${old.result.replace("_", " ")} → ${c.result.replace("_", " ")}`);
    const shift: OppShift = {
      id: b.opp.id,
      name: b.opp.name,
      beforeRank: rank(before, b.opp.id),
      afterRank: rank(after, b.opp.id),
      beforeEligibility: b.eligibility,
      afterEligibility: a.eligibility,
      checkChanges,
    };
    if (shift.beforeRank !== shift.afterRank || shift.beforeEligibility !== shift.afterEligibility || checkChanges.length)
      oppShifts.push(shift);
  }

  const changingFactIds: string[] = [];
  const inertFacts: { id: string; why: string }[] = [];
  for (const f of added) {
    const eff = after.effects[f.id];
    if (!eff) inertFacts.push({ id: f.id, why: "Not analyst-confirmed with a source — ignored by every assessment" });
    else if (eff.every((e) => e === NO_CHANGE || e === TRL_INCOMPLETE)) inertFacts.push({ id: f.id, why: eff.join(" · ") });
    else changingFactIds.push(f.id);
  }

  const anyChange = rows.some((r) => r.changed) || oppShifts.length > 0;
  if (!anyChange) changingFactIds.splice(0);
  const decisionChanged = rows[4]!.changed || rows[5]!.changed;
  const parts = rows.filter((r) => r.changed && r.label !== "Next action").map((r) => r.label.toLowerCase());
  for (const o of oppShifts) {
    if (o.beforeEligibility !== o.afterEligibility) parts.push(`${o.name} eligibility (${ELIG[o.beforeEligibility]} → ${ELIG[o.afterEligibility]})`);
    else if (o.beforeRank !== o.afterRank) parts.push(`${o.name} position`);
  }
  const summary = !anyChange
    ? added.length && inertFacts.length === added.length && added.every((f) => !after.effects[f.id])
      ? "Nothing changed: the new fact is not analyst-confirmed, so it is ignored."
      : "Nothing changed: the new facts are recorded but no rule changes any result."
    : decisionChanged
      ? `Decision changed.${parts.length ? ` Also changed: ${[...new Set(parts)].join("; ")}.` : ""}`
      : `Assessment changed — top opportunity and next action stay the same. Changed: ${[...new Set(parts)].join("; ")}.`;

  return { rows, oppShifts, changingFactIds, inertFacts, anyChange, decisionChanged, summary };
}

/** Temporary what-if calculation. It never stores or confirms the source claim. */
export function previewPendingFact(
  startup: Startup,
  extra: Fact[],
  factId: string,
  opts: { asOf?: string; catalog?: CatalogOpp[] } = {},
) {
  const fact = extra.find((f) => f.id === factId && !f.confirmed);
  if (!fact?.source.trim()) return null;
  const before = assess(startup, extra, opts);
  // This label exists only inside the temporary calculation; it is never saved as evidence.
  const hypothetical: Fact = { ...fact, confirmed: true, verificationSource: "Hypothetical only — not inspected" };
  const after = assess(startup, extra.map((f) => f.id === factId ? hypothetical : f), opts);
  return { fact, before, after, comparison: compareAssessments(before, after, [hypothetical]) };
}
