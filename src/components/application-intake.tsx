import { useState } from "react";
import { ArrowRight, Check, FileText, LoaderCircle, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { FACT_TYPE_LABELS, type Fact } from "@/lib/radar-rules";
import { claimToFact, intakeSchema, SAMPLE_CLAIMS, SAMPLE_TEXT, validateSuggestions, type Suggestion } from "@/lib/intake";

export function ApplicationIntake({ open, onClose, onImport, startupName }: {
  open: boolean; onClose: () => void; onImport: (facts: Fact[]) => void; startupName: string;
}) {
  const [text, setText] = useState("");
  const [sourceTitle, setSourceTitle] = useState(`Pitch from ${startupName}`);
  const [sourceUrl, setSourceUrl] = useState("");
  const [claims, setClaims] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [mode, setMode] = useState<"ai" | "sample">("ai");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const clearResult = () => { setClaims([]); setSelected([]); setError(""); };
  const sample = () => {
    setText(SAMPLE_TEXT); setSourceTitle("Fictional founder update — demo sample"); setSourceUrl("");
    setClaims(SAMPLE_CLAIMS); setSelected([0]); setMode("sample"); setError("");
  };
  const extract = async () => {
    const parsed = intakeSchema.safeParse({ text, sourceTitle, sourceUrl });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Check the input."); return; }
    setBusy(true); setError(""); setClaims([]);
    try {
      const response = await fetch("/api/extract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(45000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not extract claims.");
      const next = validateSuggestions({ claims: data.claims }, parsed.data.text);
      setClaims(next); setSelected(next.map((_, i) => i)); setMode("ai");
      if (!next.length) setError("No relevant claims found. Try a startup application or add a fact manually.");
    } catch (e) { setError(e instanceof Error ? e.message : "AI is unavailable. Please retry."); }
    finally { setBusy(false); }
  };
  const save = () => {
    const input = intakeSchema.parse({ text, sourceTitle, sourceUrl });
    onImport(selected.map((i) => claimToFact(claims[i]!, input, mode)));
    setClaims([]); setSelected([]); onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2 text-primary"><Sparkles className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-widest">Pitch reader</span></div>
          <DialogTitle className="text-2xl">Find the facts worth checking</DialogTitle>
          <DialogDescription>Paste a pitch, email or startup update from {startupName}. AI highlights claims and quotes. Scores change only after you check the evidence.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2"><Label htmlFor="intake-text">Startup text</Label><Textarea id="intake-text" rows={7} value={text} maxLength={16000} disabled={busy} onChange={(e) => { setText(e.target.value); clearResult(); }} placeholder="Paste a pitch, founder email or test report…" /><p className="text-xs text-muted-foreground">{text.length.toLocaleString()} / 16,000 characters · Text is sent to the configured AI provider when you analyse it.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="intake-source">Where did this text come from?</Label><Input id="intake-source" value={sourceTitle} disabled={busy} onChange={(e) => { setSourceTitle(e.target.value); clearResult(); }} placeholder="Founder email, pitch deck…" /></div>
          <div className="space-y-2"><Label htmlFor="intake-url">Source URL (optional)</Label><Input id="intake-url" value={sourceUrl} disabled={busy} onChange={(e) => { setSourceUrl(e.target.value); clearResult(); }} placeholder="https://..." /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={extract} disabled={busy || text.trim().length < 80 || sourceTitle.trim().length < 3}>{busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />} {busy ? "Finding claims and quotes…" : "Find claims with AI"}</Button>
          <Button variant="outline" onClick={sample} disabled={busy || startupName !== "Baltic Nutriloop"}><FileText /> Sample Baltic walkthrough · no AI call</Button>
        </div>
        {error && <p role="alert" className="rounded-xl bg-warning-soft p-3 text-sm text-warning">{error}</p>}
        {!!claims.length && (
          <section aria-label="Suggested claims" className="space-y-3 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Select claims to save for review</h3><span className="rounded-full bg-secondary px-3 py-1 text-xs">{mode === "sample" ? "Prepared fictional sample · not AI output" : "AI suggestions · unverified"}</span></div>
            {claims.map((claim, i) => (
              <label key={i} className="flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors hover:bg-secondary">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" checked={selected.includes(i)} onChange={() => setSelected((old) => old.includes(i) ? old.filter((n) => n !== i) : [...old, i])} />
                <div className="min-w-0"><p className="text-xs font-semibold text-primary">{FACT_TYPE_LABELS[claim.type]} · Needs review</p><p className="mt-1 font-semibold">{claim.text}</p><blockquote className="mt-2 border-l-2 border-primary/30 pl-3 text-sm text-muted-foreground">“{claim.quote}”</blockquote><p className="mt-2 text-sm"><span className="font-medium">Ask for: </span>{claim.verificationNeed}</p></div>
              </label>
            ))}
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-3 shadow-soft"><p className="text-xs text-muted-foreground"><Check className="mr-1 inline h-3 w-3" />Saved claims will not change the assessment.</p><Button onClick={save} disabled={!selected.length}>Save {selected.length} for review <ArrowRight /></Button></div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
