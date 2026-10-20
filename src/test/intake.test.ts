import { describe, expect, it, vi, afterEach } from "vitest";
import { claimToFact, intakeSchema, SAMPLE_CLAIMS, SAMPLE_TEXT, validateSuggestions } from "@/lib/intake";
import { assess, compareAssessments, getStartup } from "@/lib/radar-rules";
import { loadUserFacts } from "@/lib/fact-storage";
import { handleExtractionRequest } from "@/lib/extract.server";

const input = { text: SAMPLE_TEXT, sourceTitle: "Fictional application", sourceUrl: "" };
const request = (body = input, origin = "http://localhost:4173") => new Request("http://localhost:4173/api/extract", {
  method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body),
});
afterEach(() => vi.restoreAllMocks());

describe("application evidence intake", () => {
  it("unknown company stage is not falsely excluded from a stage range", () => {
    const unknown = { ...getStartup("baltic-nutriloop"), stage: "Unknown" };
    const match = assess(unknown).opps.find((m) => m.opp.id === "redstone-blue");
    expect(match?.eligibility).toBe("needs_verification");
  });
  it("invalid saved fact data cannot crash the assessment", () => {
    const store = { getItem: () => JSON.stringify([{ id: "broken", text: "bad data" }]), setItem: () => {}, removeItem: () => {} };
    expect(loadUserFacts(store, "test")).toEqual([]);
  });
  it("a redundant technical fact does not claim the decision changed", () => {
    const s = getStartup("baltic-nutriloop");
    const redundant = { ...s.facts[0]!, id: "repeat", userAdded: true };
    const cmp = compareAssessments(assess(s), assess(s, [redundant]), [redundant]);
    expect(cmp.anyChange).toBe(false);
    expect(cmp.changingFactIds).toEqual([]);
  });
  it("rejects invented quotes, invalid claim types and arbitrary executable source URLs", () => {
    expect(() => validateSuggestions({ claims: [{ ...SAMPLE_CLAIMS[0], quote: "A quotation that never appeared in the application." }] }, SAMPLE_TEXT)).toThrow();
    expect(() => validateSuggestions({ claims: [{ ...SAMPLE_CLAIMS[0], type: "verified" }] }, SAMPLE_TEXT)).toThrow();
    expect(intakeSchema.safeParse({ ...input, sourceUrl: "javascript:alert(1)" }).success).toBe(false);
  });
  it("preserves the source and never confirms model suggestions", () => {
    const claim = validateSuggestions({ claims: SAMPLE_CLAIMS }, SAMPLE_TEXT)[0]!;
    const fact = claimToFact(claim, input, "ai");
    expect(fact.confirmed).toBe(false);
    expect(fact.sourceExcerpt).toBe(claim.quote);
    expect(fact.sourceText).toBe(SAMPLE_TEXT);
    expect(fact.trl).toBeUndefined();
    const startup = getStartup("baltic-nutriloop");
    expect(assess(startup, [fact])).toEqual(assess(startup));
    expect(assess(startup, [{ ...fact, confirmed: true }])).toEqual(assess(startup));
    const confirmed = assess(startup, [{ ...fact, confirmed: true, verificationSource: "Signed agreement (demo)" }]);
    expect(confirmed.brl.value).toBe(5);
    expect(confirmed.trl).toEqual(assess(startup).trl);
    expect(confirmed.oceanImpact).toEqual(assess(startup).oceanImpact);
  });
  it("explicitly labels a prepared sample and treats projected impact as other", () => {
    const claims = validateSuggestions({ claims: SAMPLE_CLAIMS }, SAMPLE_TEXT);
    const forecast = claimToFact(claims[2]!, input, "sample");
    expect(forecast.origin).toBe("sample");
    expect(forecast.type).toBe("other");
  });
  it("reports a missing server key without pretending to call AI", async () => {
    const result = await handleExtractionRequest(request(), {});
    expect(result.status).toBe(503);
    expect((await result.json()).error).toMatch(/not connected/);
  });
  it("blocks cross-origin requests before using a key", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect((await handleExtractionRequest(request(input, "https://other.example"), { OPENAI_API_KEY: "test" })).status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });
  it("calls the provider on the server and validates its response", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ claims: SAMPLE_CLAIMS }) }] }],
    }));
    const result = await handleExtractionRequest(request(), { OPENAI_API_KEY: "test-server-only" });
    expect(result.status).toBe(200);
    expect((await result.json()).claims).toHaveLength(3);
    expect(spy.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/responses");
    const body = JSON.parse(String(spy.mock.calls[0]?.[1]?.body));
    expect(body.store).toBe(false);
    expect(body.text.format.strict).toBe(true);
  });
  it("rejects fabricated provider output rather than falling back to a sample", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
      status: "completed", output: [{ type: "message", content: [{
        type: "output_text", text: JSON.stringify({ claims: [{ ...SAMPLE_CLAIMS[0], quote: "This source did not say this." }] }),
      }] }],
    }));
    expect((await handleExtractionRequest(request(), { OPENAI_API_KEY: "test" })).status).toBe(502);
  });
});
