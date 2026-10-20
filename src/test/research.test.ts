import { afterEach, describe, expect, it, vi } from "vitest";
import { handleResearchRequest } from "@/lib/research.server";
import { researchGap, researchLeads } from "@/lib/research-leads";

const req = (body: unknown, origin = "http://localhost:4173") => new Request("http://localhost:4173/api/research", {
  method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body),
});

afterEach(() => vi.unstubAllGlobals());

describe("public research", () => {
  it("offers cited sentences as review leads without treating AI's missing-proof inference as a fact", () => {
    const brief = "Origin by Ocean turns algae into ingredients. [1] The key missing proof is a customer contract. [2]";
    const first = brief.indexOf("[1]");
    const second = brief.indexOf("[2]");
    const result = { brief, status: "cited" as const, searchedAt: "2026-10-17T00:00:00Z",
      sources: [{ url: "https://example.org/about", title: "About" }],
      citations: [
        { start: first, end: first + 3, url: "https://example.org/about", title: "About" },
        { start: second, end: second + 3, url: "https://example.org/about", title: "About" },
      ],
    };
    expect(researchLeads(result)).toEqual([{ text: "Origin by Ocean turns algae into ingredients.", source: "https://example.org/about", sourceTitle: "About" }]);
    expect(researchGap(result)).toBe("The key missing proof is a customer contract.");
    const privateBrief = brief.replace("missing proof", "missing private proof");
    const privateProof = { ...result, brief: privateBrief,
      citations: [result.citations[0]!, { ...result.citations[1]!, start: privateBrief.indexOf("[2]"), end: privateBrief.indexOf("[2]") + 3 }] };
    expect(researchGap(privateProof)).toContain("missing private proof");
    expect(researchLeads(privateProof)).toHaveLength(1);
  });

  it("rejects invalid requests before making a provider call", async () => {
    const provider = vi.fn();
    vi.stubGlobal("fetch", provider);
    expect((await handleResearchRequest(req({ name: "A", website: "javascript:bad" }), { OPENAI_API_KEY: "fake" })).status).toBe(400);
    expect((await handleResearchRequest(req({ name: "Company", website: "" }, "https://evil.example"), { OPENAI_API_KEY: "fake" })).status).toBe(403);
    expect(provider).not.toHaveBeenCalled();
  });

  it("returns cited research leads without creating or confirming facts", async () => {
    const provider = vi.fn(async (_url: string, options: RequestInit) => {
      const body = JSON.parse(options.body as string);
      expect(body.tools).toEqual([{ type: "web_search" }]);
      expect(body.tool_choice).toBe("required");
      expect(body.store).toBe(false);
      return Response.json({ status: "completed", output: [
        { type: "web_search_call", action: { type: "search" } },
        { type: "message", content: [{ type: "output_text", text: "Company works on marine sensors.", annotations: [
          { type: "url_citation", start_index: 0, end_index: 30, url: "https://example.org/company", title: "Official site" },
          { type: "url_citation", start_index: 0, end_index: 10, url: "javascript:bad", title: "Unsafe" },
        ] }] },
      ] });
    });
    vi.stubGlobal("fetch", provider);
    const response = await handleResearchRequest(req({ name: "Marine Sensors", website: "" }), { OPENAI_API_KEY: "fake" });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sources).toEqual([{ url: "https://example.org/company", title: "Official site" }]);
    expect(data.citations).toHaveLength(1);
    expect(data.facts).toBeUndefined();
    expect(provider).toHaveBeenCalledOnce();
  });
});
