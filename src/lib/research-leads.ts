export type ResearchSource = { url: string; title: string };
export type ResearchCitation = ResearchSource & { start: number; end: number };
export type ResearchResult = {
  brief: string;
  sources: ResearchSource[];
  citations: ResearchCitation[];
  searchedAt: string;
  status: "cited" | "no_sources";
};
export type ResearchLead = { text: string; source: string; sourceTitle: string };

/** Turn cited summary sentences into review leads, never verified facts or exact source quotes. */
export function researchLeads(result: ResearchResult): ResearchLead[] {
  const citations = [...result.citations].sort((a, b) => a.start - b.start);
  const leads: ResearchLead[] = [];
  const seen = new Set<string>();
  let previousEnd = 0;
  for (const citation of citations) {
    if (citation.start < previousEnd || citation.end > result.brief.length) continue;
    const text = result.brief.slice(previousEnd, citation.start)
      .replace(/\*\*/g, "").replace(/^[\s•–-]+/, "").replace(/\s+/g, " ").trim();
    previousEnd = citation.end;
    if (text.length < 25 || text.length > 500 || /\bmissing (?:private )?proof\b/i.test(text)) continue;
    if (!result.sources.some((source) => source.url === citation.url)) continue;
    const key = `${citation.url}:${text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    leads.push({ text, source: citation.url, sourceTitle: citation.title });
  }
  return leads.slice(0, 5);
}

/** The model's proposed diligence question. It is a suggestion, not an established fact. */
export function researchGap(result: ResearchResult): string | null {
  const citations = [...result.citations].sort((a, b) => a.start - b.start);
  let previousEnd = 0;
  for (const citation of citations) {
    if (citation.start < previousEnd || citation.end > result.brief.length) continue;
    const text = result.brief.slice(previousEnd, citation.start).replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
    previousEnd = citation.end;
    if (/\b(missing (?:private )?proof|diligence gap|evidence needed|need to verify)\b/i.test(text)) return text;
  }
  return null;
}
