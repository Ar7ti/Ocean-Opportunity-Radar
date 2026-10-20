import { describe, expect, it } from "vitest";
import { assess, compareAssessments, confirmationError, TRL_INCOMPLETE, KIND_LABEL, getStartup, previewPendingFact, MEASUREMENT_NEEDED, NO_CHANGE, STARTUPS, type Fact } from "@/lib/radar-rules";
import { CATALOG, type CatalogOpp } from "@/lib/opportunity-catalog";

const ASOF = "2026-10-16";
import { clearUserFacts, loadUserFacts, saveUserFacts, type KV } from "@/lib/fact-storage";

const nutri = getStartup("baltic-nutriloop");
const pilot = (confirmed: boolean, source = "Contract"): Fact => ({
  id: "p", text: "Paid pilot", type: "paid_pilot", source, confirmed, demo: true, userAdded: true,
});
const memStore = (): KV => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

describe("radar rules", () => {
  it("switching startups gives each its own facts and assessment", () => {
    expect(STARTUPS).toHaveLength(3);
    const [a, b, c] = STARTUPS.map((s) => assess(s)) as [ReturnType<typeof assess>, ReturnType<typeof assess>, ReturnType<typeof assess>];
    expect(a.trl.value).toBe(6);
    expect(b.trl.value).toBe(5);
    expect(c.trl.value).toBe(7);
    expect(c.oceanImpact.measured).toBe(true);
    expect(a.oceanImpact.value).toBe(MEASUREMENT_NEEDED);
  });

  it("saved facts survive a reload and stay separate per startup", () => {
    const store = memStore();
    saveUserFacts(store, "kelpform", [pilot(true)]);
    expect(loadUserFacts(store, "kelpform")).toEqual([pilot(true)]);
    expect(loadUserFacts(store, "netsense")).toEqual([]);
    clearUserFacts(store, "kelpform");
    expect(loadUserFacts(store, "kelpform")).toEqual([]);
  });

  it("rejects confirmation without a source", () => {
    expect(confirmationError({ confirmed: true, source: "  " })).not.toBeNull();
    expect(confirmationError({ confirmed: true, source: "Contract" })).toBeNull();
    expect(assess(nutri, [pilot(true, "")])).toEqual(assess(nutri));
  });

  it("unconfirmed fact changes nothing", () => {
    for (const s of STARTUPS) expect(assess(s, [pilot(false)])).toEqual(assess(s));
  });

  it("previews a possible decision unlock without confirming or changing the current assessment", () => {
    const claim: Fact = { ...pilot(false, "Founder application"), origin: "ai", verificationNeed: "Inspect the signed paid agreement" };
    const actual = assess(nutri, [claim], { asOf: ASOF });
    const preview = previewPendingFact(nutri, [claim], claim.id, { asOf: ASOF });
    expect(actual).toEqual(assess(nutri, [], { asOf: ASOF }));
    expect(preview?.comparison.decisionChanged).toBe(true);
    expect(preview?.before.opps[0]?.opp.id).toBe("helsinki-bes");
    expect(preview?.after.opps[0]?.opp.id).toBe("redstone-blue");
    expect(preview?.after.brl.value).toBe(5);
    expect(claim.confirmed).toBe(false);
    expect(claim.verificationSource).toBeUndefined();
    expect(previewPendingFact(nutri, [{ ...claim, confirmed: true }], claim.id, { asOf: ASOF })).toBeNull();
  });

  it("does not advertise a decision unlock for an unmeasured forecast", () => {
    const claim: Fact = { id: "forecast", text: "We expect a 30% reduction", type: "other", source: "Founder application", confirmed: false, demo: true };
    const preview = previewPendingFact(nutri, [claim], claim.id, { asOf: ASOF });
    expect(preview?.comparison.anyChange).toBe(false);
    expect(preview?.after.oceanImpact.measured).toBe(false);
  });

  it("confirmed paid pilot changes only business, investor readiness, ranking and action", () => {
    const b = assess(nutri, [], { asOf: ASOF });
    const a = assess(nutri, [pilot(true)], { asOf: ASOF });
    expect(a.brl.value).toBe(5);
    expect(b.brl.value).toBe(4);
    expect(a.irl.value).toBe((b.irl.value ?? 0) + 1);
    expect(a.trl).toEqual(b.trl);
    expect(a.oceanImpact).toEqual(b.oceanImpact);
    expect(a.action).not.toBe(b.action);
    expect(b.opps.map((o) => o.opp.id)).toEqual(["helsinki-bes", "eic-accelerator", "redstone-blue"]);
    expect(a.opps[0]?.opp.id).toBe("redstone-blue");
  });

  it("fact type without a rule is recorded with no assessment change", () => {
    expect(assess(getStartup("kelpform")).effects["kf3"]).toEqual([NO_CHANGE]);
  });

  it("missing technical evidence shows TRL unknown, not TRL 1", () => {
    const bare = { ...nutri, facts: [] };
    expect(assess(bare).trl.value).toBeNull();
  });

  it("closed opportunity is never ranked and never says apply", () => {
    const helsinki = CATALOG.find((o) => o.id === "helsinki-bes")!;
    const closedExplicit: CatalogOpp = { ...helsinki, id: "closed", status: "closed" };
    for (const [opp, asOf] of [[helsinki, "2026-12-01"], [closedExplicit, ASOF]] as const) {
      const r = assess(nutri, [], { asOf, catalog: [opp] });
      expect(r.opps).toHaveLength(0);
      expect(r.notNow[0]?.actionable).toBe(false);
      expect(r.notNow[0]?.action).not.toMatch(/apply now|apply before|then apply/i);
    }
  });

  it("missing eligibility information stays unknown and asks to verify", () => {
    const r = assess(nutri, [], { asOf: ASOF });
    const h = r.opps.find((o) => o.opp.id === "helsinki-bes")!;
    expect(h.eligibility).toBe("needs_verification");
    expect(h.checks.some((c) => c.result === "unknown")).toBe(true);
    expect(h.action).toMatch(/^Verify eligibility/);
    expect(r.action).toMatch(/Verify eligibility/);
    const red = r.opps.find((o) => o.opp.id === "redstone-blue")!;
    expect(red.opp.deadline).toBeNull();
    // Paying customer is only our analyst preference, not a Redstone requirement.
    expect(red.opp.hardRequirements.some((q) => /customer/i.test(q.label))).toBe(false);
  });

  it("startup outside the required geography is excluded", () => {
    const eic = CATALOG.find((o) => o.id === "eic-accelerator")!;
    const strict: CatalogOpp = {
      ...eic,
      hardRequirements: [{ kind: "geography", label: "EU only", countries: ["Finland", "Estonia"], outside: "not_met", quote: "test" }],
    };
    const r = assess({ ...nutri, country: "United States" }, [], { asOf: ASOF, catalog: [strict] });
    expect(r.opps).toHaveLength(0);
    expect(r.notNow[0]?.eligibility).toBe("excluded");
    // Unlisted country on the real EIC entry stays unknown rather than excluded.
    const r2 = assess({ ...nutri, country: "Atlantis" }, [], { asOf: ASOF, catalog: [eic] });
    expect(r2.opps[0]?.eligibility).toBe("needs_verification");
  });

  it("unsupported impact claim is not counted as measured", () => {
    const claim: Fact = { id: "i", text: "Cleaner water", type: "ocean_impact", source: "Founder claim", confirmed: true, demo: true, impactResult: "30" };
    const r = assess(nutri, [claim]);
    expect(r.oceanImpact.value).toBe(MEASUREMENT_NEEDED);
    expect(r.oceanImpact.measured).toBe(false);
    const full: Fact = { ...claim, impactUnit: "% less nitrogen", impactPeriod: "2026 season" };
    expect(assess(nutri, [full]).oceanImpact.measured).toBe(true);
  });

  it("missing customer evidence shows BRL unknown, not BRL 1", () => {
    expect(assess({ ...nutri, facts: [] }).brl.value).toBeNull();
  });

  it("confirmed technical test with an analyst-chosen TRL updates TRL and checks", () => {
    const kelp = getStartup("kelpform");
    const t: Fact = { id: "t", text: "Pilot line run", type: "technical_test", source: "Report", confirmed: true, demo: true, trl: 7 };
    const b = assess(kelp, [], { asOf: ASOF });
    const a = assess(kelp, [t], { asOf: ASOF });
    expect(b.trl.value).toBe(5);
    expect(a.trl.value).toBe(7);
    const eicCheck = (x: typeof a) => x.notNow.concat(x.opps).find((o) => o.opp.id === "eic-accelerator")!.checks.find((c) => /TRL/.test(c.label))!.result;
    expect(eicCheck(b)).toBe("not_met");
    expect(eicCheck(a)).toBe("met");
  });

  it("incomplete technical test is saved but does not change TRL", () => {
    const kelp = getStartup("kelpform");
    for (const trl of [undefined, 0, 10, 6.5]) {
      const t: Fact = { id: "t", text: "Reached TRL 8 in tests", type: "technical_test", source: "Report", confirmed: true, demo: true, trl };
      const a = assess(kelp, [t]);
      expect(a.trl).toEqual(assess(kelp).trl);
      expect(a.effects["t"]).toEqual([TRL_INCOMPLETE]);
    }
  });

  it("Helsinki attendance yes / no / unknown drives the eligibility check", () => {
    const h = CATALOG.filter((o) => o.id === "helsinki-bes");
    const run = (v: "yes" | "no" | "unknown") => {
      const r = assess({ ...nutri, canAttendHelsinki: v }, [], { asOf: ASOF, catalog: h });
      return [...r.opps, ...r.notNow][0]!.eligibility;
    };
    expect(run("yes")).toBe("eligible");
    expect(run("no")).toBe("excluded");
    expect(run("unknown")).toBe("needs_verification");
  });

  it("next action matches the type of its recommended opportunity", () => {
    const one = (id: string, st = { ...nutri, canAttendHelsinki: "yes" as const }, extra: Fact[] = []) =>
      assess(st, extra, { asOf: ASOF, catalog: CATALOG.filter((o) => o.id === id) });
    const acc = one("helsinki-bes");
    expect(acc.action).toMatch(/application/);
    expect(acc.action).not.toMatch(/investor/i);
    const grant = one("eic-accelerator");
    expect(grant.action).toMatch(/short proposal/);
    expect(grant.action).not.toMatch(/investor/i);
    const inv = one("redstone-blue");
    expect(inv.action).toMatch(/official contact route before requesting an introduction/);
    expect(KIND_LABEL.investor).toBe("investor");
    // Paid-pilot demo: top becomes Redstone and the action follows its type.
    const after = assess(nutri, [pilot(true)], { asOf: ASOF });
    expect(after.opps[0]?.opp.kind).toBe("investor");
    expect(after.action).toMatch(/contact route/);
  });

  it("decision scenario: confirmed paid pilot changes the recommendation and the path cites that fact", () => {
    const b = assess(nutri, [], { asOf: ASOF });
    const p = pilot(true);
    const a = assess(nutri, [p], { asOf: ASOF });
    const c = compareAssessments(b, a, [p]);
    expect(c.decisionChanged).toBe(true);
    expect(c.changingFactIds).toEqual(["p"]);
    const row = (l: string) => c.rows.find((r) => r.label.startsWith(l))!;
    expect(row("Business readiness")).toMatchObject({ before: "BRL 4", after: "BRL 5", changed: true });
    expect(row("Investor checklist")).toMatchObject({ before: "2/4", after: "3/4" });
    expect(row("Top opportunity")).toMatchObject({ before: "Helsinki Blue Economy Studio", after: "Redstone Blue Economy" });
    expect(row("Technology readiness").changed).toBe(false);
    expect(row("Measured ocean impact").changed).toBe(false);
    expect(a.path.evidenceFactIds[0]).toBe("p");
    expect(c.oppShifts.find((o) => o.id === "redstone-blue")).toMatchObject({ beforeRank: 3, afterRank: 1 });
    // Redstone: contact route not established — never "apply".
    expect(a.action).not.toMatch(/apply/i);
    expect(a.opps[0]!.action).not.toMatch(/apply/i);
  });

  it("technical scenario: new TRL changes eligibility without a false 'nothing changed'", () => {
    const kelp = getStartup("kelpform");
    const t: Fact = { id: "t", text: "Pilot line run", type: "technical_test", source: "Report", confirmed: true, demo: true, trl: 7 };
    const b = assess(kelp, [], { asOf: ASOF });
    const a = assess(kelp, [t], { asOf: ASOF });
    const c = compareAssessments(b, a, [t]);
    expect(c.anyChange).toBe(true);
    expect(c.summary).not.toMatch(/nothing changed/i);
    expect(c.rows.find((r) => r.label === "Technology readiness")).toMatchObject({ before: "TRL 5", after: "TRL 7" });
    const eic = c.oppShifts.find((o) => o.id === "eic-accelerator")!;
    expect(eic.beforeEligibility).toBe("excluded");
    expect(eic.afterEligibility).not.toBe("excluded");
    expect(eic.checkChanges.join()).toMatch(/TRL 6 or higher: not met → met/);
  });

  it("unconfirmed fact is reported as ignored, with no changes", () => {
    const p = pilot(false);
    const c = compareAssessments(assess(nutri), assess(nutri, [p]), [p]);
    expect(c.anyChange).toBe(false);
    expect(c.summary).toMatch(/not analyst-confirmed/);
    expect(c.inertFacts).toHaveLength(1);
  });

  it("missing-proof step follows the top opportunity, not the generic checklist", () => {
    const b = assess(nutri, [], { asOf: ASOF });
    expect(b.path.missing).toMatch(/^Can attend in Helsinki: unknown/);
    const a = assess(nutri, [pilot(true)], { asOf: ASOF });
    expect(a.path.missing).toMatch(/Redstone Blue Economy's contact \/ introduction route/);
    expect(a.path.missing).not.toMatch(/checklist|Measured ocean impact/i);
  });
});
