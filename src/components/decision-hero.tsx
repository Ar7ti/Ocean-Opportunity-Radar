import { ArrowRight, Check, Compass, FileCheck2, Target } from "lucide-react";
import type { Assessment, Comparison, Fact } from "@/lib/radar-rules";

export function DecisionHero({ before, after, comparison: c, factById, onOpenFact }: {
  before: Assessment; after: Assessment; comparison: Comparison;
  factById: (id?: string) => Fact | undefined; onOpenFact: (id: string) => void;
}) {
  const top = after.opps[0], oldTop = before.opps[0];
  const cause = c.changingFactIds.map(factById).find(Boolean);
  const techChanged = before.trl.value !== after.trl.value;
  const drivingReason = cause ? top?.reasons.find((reason) => reason.factId === cause.id && reason.points > 0) : undefined;
  const rankingReason = drivingReason?.text ?? top?.reasons.find((reason) => reason.points > 0)?.text ?? after.path.reason;
  const title = c.decisionChanged ? "New evidence. A clearer next move." : c.anyChange ? "Stronger evidence. A clearer assessment." : "Find the next move worth making.";
  return (
    <section aria-label="Decision overview" aria-live="polite" className="relative overflow-hidden rounded-[32px] border border-border/70 bg-card p-6 shadow-soft sm:p-10">
      <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.9_0.06_200/0.55),transparent_65%)]" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold " + (c.anyChange ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>{c.anyChange ? <FileCheck2 className="h-3.5 w-3.5" /> : <Compass className="h-3.5 w-3.5" />}{c.decisionChanged ? "Decision changed" : c.anyChange ? "Assessment changed" : "Your opportunity path"}</span>
          <span className="text-xs text-muted-foreground">Evidence first. Every recommendation explained.</span>
        </div>
        <h2 className="mt-5 max-w-3xl text-[2rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl">{title}</h2>

        {c.decisionChanged && top ? (
          <div className="mt-8 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-3xl bg-muted p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Previous priority</p><p className="mt-2 text-xl font-semibold text-muted-foreground line-through decoration-1 sm:text-2xl">{oldTop?.opp.name || "No ranked opportunity"}</p></div>
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift"><ArrowRight className="h-5 w-5 rotate-90 sm:rotate-0" /></span>
            <div className="rounded-3xl bg-[linear-gradient(135deg,oklch(0.96_0.03_210),oklch(0.93_0.05_195))] p-5 ring-1 ring-primary/20 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Recommended next · #1</p><p className="mt-2 text-xl font-bold text-primary sm:text-2xl">{top.opp.name}</p></div>
          </div>
        ) : c.anyChange && techChanged ? (
          <div className="mt-6 flex flex-wrap items-center gap-4 text-4xl font-semibold tracking-tight sm:text-5xl"><span className="text-muted-foreground">TRL {before.trl.value ?? "unknown"}</span><ArrowRight className="h-8 w-8 text-primary" /><span className="text-primary">TRL {after.trl.value ?? "unknown"}</span><span className="w-full text-sm font-normal tracking-normal text-muted-foreground">Top opportunity stays {top?.opp.name || "unavailable"}. Check the changed requirements below.</span></div>
        ) : top ? (
          <p className="mt-4 bg-[linear-gradient(100deg,oklch(0.5_0.14_240),oklch(0.62_0.12_200))] bg-clip-text text-2xl font-semibold text-transparent sm:text-3xl">{top.opp.name}</p>
        ) : <p className="mt-4 font-medium">No opportunity passes the stored checks yet.</p>}

        {cause && <button onClick={() => onOpenFact(cause.id)} className="press mt-6 flex w-full items-start gap-3 rounded-2xl bg-success-soft p-4 text-left text-sm ring-1 ring-success/15 hover:ring-success/40"><FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /><span><span className="font-semibold">{cause.text}</span><span className="mt-0.5 block text-xs text-muted-foreground">Analyst-confirmed · {cause.verificationSource || cause.source} · View evidence ↗</span></span></button>}

        {c.anyChange && <div className="mt-4 flex flex-wrap gap-2">{[
          ["BRL", before.brl.value, after.brl.value], ["Checklist", before.irl.value, after.irl.value], ["TRL", before.trl.value, after.trl.value],
        ].map(([name, old, next]) => <span key={String(name)} className={"rounded-full px-3.5 py-1.5 text-sm " + (old !== next ? "bg-primary/10 font-semibold text-primary" : "bg-muted text-muted-foreground")}>{name} {old ?? "?"}{old !== next ? " → " + (next ?? "?") : " · unchanged"}</span>)}<span className="rounded-full bg-muted px-3.5 py-1.5 text-sm text-muted-foreground">Ocean impact · {before.oceanImpact.value === after.oceanImpact.value ? "unchanged" : "updated"}</span></div>}

        {top && <div className="mt-8 grid gap-3 lg:grid-cols-3">
          <div className="lift rounded-3xl bg-muted/70 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Why this ranks first · our rule</p>
            <p className="mt-2 text-[15px] font-medium leading-snug">{rankingReason}</p>
          </div>
          <div className="lift rounded-3xl bg-warning-soft p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-warning">Check before acting</p>
            <p className="mt-2 text-[15px] font-medium leading-snug">{after.path.missing}</p>
          </div>
          <div className="lift abyss-panel relative overflow-hidden rounded-3xl p-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-lagoon">Next action</p>
            <p className="mt-2 text-[15px] font-semibold leading-snug">{after.action}</p>
          </div>
        </div>}
        {!top && <div className="mt-6 flex items-start gap-3 border-t pt-6"><Target className="mt-1 h-5 w-5 shrink-0 text-primary" /><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Next action</p><p className="mt-1 text-base font-semibold sm:text-lg">{after.action}</p></div></div>}
        <p className="mt-5 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />{c.decisionChanged ? "Ranked using our visible analyst rules. A paid customer is our preference, not a published Redstone requirement or an investment commitment." : "Initial screening from the evidence available. The programme or investor makes the final decision."}</p>
      </div>
    </section>
  );
}
