import { useEffect, useState } from "react";
import { Copy, ExternalLink, LoaderCircle, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { researchGap, researchLeads, type ResearchLead, type ResearchResult } from "@/lib/research-leads";

function Brief({ result }: { result: ResearchResult }) {
  const clean = (text: string) => text.replace(/\*\*/g, "").replace(/\n\s*-\s+/g, "\n");
  const ordered = [...result.citations].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ordered.forEach((citation, index) => {
    if (citation.start < cursor || citation.end > result.brief.length) return;
    parts.push(clean(result.brief.slice(cursor, citation.start)));
    const original = result.brief.slice(citation.start, citation.end);
    const isCitationMarker = /^\s*(?:\(\[|\[|cite)/.test(original) && (original.includes("http") || original.includes("cite"));
    const sourceNumber = result.sources.findIndex((source) => source.url === citation.url) + 1;
    parts.push(<a key={index} href={citation.url} target="_blank" rel="noreferrer" title={citation.title}
      className="font-medium text-primary underline underline-offset-2">{isCitationMarker ? `[${sourceNumber || index + 1}]` : clean(original)}</a>);
    cursor = citation.end;
  });
  parts.push(clean(result.brief.slice(cursor)));
  return <p className="whitespace-pre-line text-sm leading-6">{parts}</p>;
}

export function StartupResearch({ open, onClose, onReviewLead, startupName, isDemo }: {
  open: boolean; onClose: () => void; onReviewLead: (lead: ResearchLead) => void; startupName: string; isDemo: boolean;
}) {
  const [name, setName] = useState(startupName);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const storageKey = `oor:research:v1:${startupName}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (saved && typeof saved.name === "string" && typeof saved.website === "string"
        && typeof saved.result?.brief === "string" && Array.isArray(saved.result.sources)
        && Array.isArray(saved.result.citations)) {
        setName(saved.name); setWebsite(saved.website); setResult(saved.result);
      }
    } catch { /* Ignore a malformed browser cache. */ }
  }, [storageKey]);
  const gap = result ? researchGap(result) : null;
  const requestText = gap ? `Hello,\n\nWe are reviewing ${name} for relevant ocean-sector programmes and partners. Could you share supporting documents addressing this question?\n\n${gap}\n\nPlease include dates, customer commitments and independent test results where relevant.\n\nThank you.` : "";

  const search = async () => {
    setBusy(true); setError(""); setResult(null); setCopyStatus("");
    try {
      const response = await fetch("/api/research", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), website: website.trim() }),
        signal: AbortSignal.timeout(65000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed.");
      if (typeof data.brief !== "string" || !Array.isArray(data.sources)) throw new Error("Search response was incomplete.");
      setResult(data as ResearchResult);
      try { sessionStorage.setItem(storageKey, JSON.stringify({ name: name.trim(), website: website.trim(), result: data })); }
      catch { /* Research still works when browser storage is unavailable. */ }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Search failed. Please retry."); }
    finally { setBusy(false); }
  };

  return <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <div className="mb-2 flex items-center gap-2 text-primary"><Search className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-widest">Public research</span></div>
        <DialogTitle className="text-2xl">Find public information about a startup</DialogTitle>
        <DialogDescription>AI searches the web and shows sources. These are research leads; they do not change scores until you check evidence.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="research-name">Startup name</Label><Input id="research-name" value={name} maxLength={120} disabled={busy} onChange={(event) => setName(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="research-website">Website, if known</Label><Input id="research-website" type="url" value={website} maxLength={500} disabled={busy} onChange={(event) => setWebsite(event.target.value)} placeholder="https://company.example" /></div>
      </div>
      {isDemo && <p className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">This selected demo startup is fictional. To try public research, enter a real startup name or create your own startup profile.</p>}
      <Button onClick={search} disabled={busy || name.trim().length < 2}>{busy ? <LoaderCircle className="animate-spin" /> : <Search />} {busy ? "Searching public sources…" : "Search public sources"}</Button>
      {error && <p role="alert" className="rounded-xl bg-warning-soft p-3 text-sm text-warning">{error}</p>}
      {result && <section aria-label="Public research results" className="space-y-4 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">What we found</h3><span className="text-xs text-muted-foreground">Searched {new Date(result.searchedAt).toLocaleString()}</span></div>
        {gap && <div className="rounded-xl border border-primary/20 bg-accent p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Suggested next action · check before sending</p>
          <p className="mt-1 text-sm font-medium">Ask the startup for evidence about the main gap:</p>
          <p className="mt-1 text-sm">{gap}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={async () => {
            try { await navigator.clipboard.writeText(requestText); setCopyStatus("Request copied. Review it before sending."); }
            catch { setCopyStatus("Could not copy automatically. Select the suggested question above."); }
          }}><Copy /> Copy a request to the startup</Button>
          {copyStatus && <p role="status" className="mt-2 text-xs text-muted-foreground">{copyStatus}</p>}
        </div>}
        {researchLeads(result).length > 0 && <div className="space-y-2 rounded-xl border border-primary/20 bg-secondary/60 p-4">
          <h4 className="font-semibold">Next: choose a claim to check</h4>
          <p className="text-xs text-muted-foreground">These sentences are AI summaries, not quotes from the original pages. Open the source before confirming one.</p>
          {researchLeads(result).map((lead, index) => <div key={`${lead.source}-${index}`} className="rounded-lg border bg-background p-3">
            <p className="text-sm">{lead.text}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <a href={lead.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline">Open source <ExternalLink className="h-3 w-3" /></a>
              <Button variant="outline" size="sm" onClick={() => onReviewLead(lead)}>Review this claim</Button>
            </div>
          </div>)}
        </div>}
        <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-semibold text-primary">Read the full research summary</summary><div className="mt-3"><Brief result={result} /></div></details>
        {result.sources.length ? <details><summary className="cursor-pointer text-sm font-semibold text-primary">All {result.sources.length} sources</summary><ul className="mt-2 space-y-2">{result.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 break-all text-sm text-primary underline">{source.title}<ExternalLink className="h-3.5 w-3.5 shrink-0" /></a></li>)}</ul></details>
          : <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">No cited source was returned. Do not use this result as evidence.</p>}
        <p className="rounded-xl bg-secondary p-3 text-sm">Next: open a source and check the original page. For paid customers, contracts or measured impact, ask the startup for independent proof. Public search alone does not confirm these facts.</p>
      </section>}
    </DialogContent>
  </Dialog>;
}
