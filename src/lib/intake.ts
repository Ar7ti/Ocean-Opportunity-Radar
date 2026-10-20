import { z } from "zod";
import type { Fact, FactType } from "./radar-rules";

export const intakeSchema = z.object({
  text: z.string().trim().min(80, "Paste at least 80 characters.").max(16000),
  sourceTitle: z.string().trim().min(3).max(160),
  sourceUrl: z.string().trim().max(500).refine(
    (s) => !s || /^https?:\/\/[^ \n]+$/i.test(s), "Use an http or https source URL.",
  ),
});
export type IntakeInput = z.infer<typeof intakeSchema>;
export const suggestionSchema = z.object({
  claims: z.array(z.object({
    text: z.string().trim().min(5).max(500),
    type: z.enum(["paid_pilot", "technical_test", "customer_interest", "ocean_impact", "other"]),
    quote: z.string().trim().min(12).max(1600),
    verificationNeed: z.string().trim().min(5).max(500),
  }).strict()).max(8),
}).strict();
export type Suggestion = z.infer<typeof suggestionSchema>["claims"][number];

export const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["claims"],
  properties: {
    claims: { type: "array", maxItems: 8, items: {
      type: "object", additionalProperties: false,
      required: ["text", "type", "quote", "verificationNeed"],
      properties: {
        text: { type: "string" },
        type: { type: "string", enum: ["paid_pilot", "technical_test", "customer_interest", "ocean_impact", "other"] },
        quote: { type: "string" }, verificationNeed: { type: "string" },
      },
    } },
  },
};

/** Fail closed: model output is never usable without an exact excerpt in the submitted text. */
export function validateSuggestions(raw: unknown, sourceText: string): Suggestion[] {
  const parsed = suggestionSchema.parse(raw);
  if (parsed.claims.some((c) => !sourceText.includes(c.quote))) {
    throw new Error("A suggested claim had no exact supporting quote. Please retry or add it manually.");
  }
  const seen = new Set<string>();
  return parsed.claims.filter((c) => {
    const key = c.type + ":" + c.quote;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function claimToFact(claim: Suggestion, input: IntakeInput, origin: "ai" | "sample"): Fact {
  return {
    id: "claim-" + crypto.randomUUID(), text: claim.text, type: claim.type as FactType,
    source: input.sourceUrl || input.sourceTitle, sourceTitle: input.sourceTitle,
    sourceExcerpt: claim.quote, sourceText: input.text, verificationNeed: claim.verificationNeed,
    origin, confirmed: false, demo: true, userAdded: true,
  };
}

export const SAMPLE_TEXT = [
  "Baltic Nutriloop — fictional application update for this demo.",
  "A municipal water utility signed a paid pilot agreement for our nutrient recovery unit on 12 October 2026.",
  "The pilot unit operated for six months at a demonstration site.",
  "We expect to reduce nitrogen discharge by 30%, but have not yet measured the reduction.",
].join("\n\n");
export const SAMPLE_CLAIMS: Suggestion[] = [
  { text: "Municipal water utility signed a paid pilot agreement", type: "paid_pilot",
    quote: "A municipal water utility signed a paid pilot agreement for our nutrient recovery unit on 12 October 2026.",
    verificationNeed: "Inspect the signed agreement and confirm the payment obligation; founder text alone is not proof." },
  { text: "Pilot unit operated for six months at a demonstration site", type: "technical_test",
    quote: "The pilot unit operated for six months at a demonstration site.",
    verificationNeed: "Request the test report, operating conditions and acceptance results before choosing a TRL." },
  { text: "30% nitrogen reduction is projected, not measured", type: "other",
    quote: "We expect to reduce nitrogen discharge by 30%, but have not yet measured the reduction.",
    verificationNeed: "Request measured nitrogen results, units, period and baseline. Do not count this forecast as impact." },
];
