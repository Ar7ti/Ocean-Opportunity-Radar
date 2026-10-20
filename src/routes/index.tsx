import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Command as CommandIcon,
  Compass,
  FileText,
  Fish,
  FlaskConical,
  Landmark,
  Lightbulb,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  assess,
  compareAssessments,
  confirmationError,
  FACT_TYPE_LABELS,
  previewPendingFact,
  STARTUPS,
  fmtDate,
  type Fact,
  type FactType,
  type Metric,
  type OppMatch,
  type OppShift,
  type Comparison,
  type Assessment,
  type Startup,
} from "@/lib/radar-rules";
import { NewStartup } from "@/components/new-startup";
import { ApplicationIntake } from "@/components/application-intake";
import { StartupResearch } from "@/components/startup-research";
import type { ResearchLead } from "@/lib/research-leads";
import { DecisionHero } from "@/components/decision-hero";
import { RadarScope } from "@/components/radar-scope";
import { CommandMenu, type CommandAction } from "@/components/command-menu";
import { Gauge, Reveal } from "@/components/motion";
import { LogoMark } from "@/components/brand/logo";
import { useScrollSpy } from "@/hooks/use-motion";
import { clearUserFacts, loadUserFacts, saveUserFacts, SELECTED_KEY } from "@/lib/fact-storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ocean Opportunity Radar · Analyst workspace" },
      {
        name: "description",
        content: "Analyst view: verified facts, readiness and best next action for fictional demo ocean startups.",
      },
      { property: "og:title", content: "Ocean Opportunity Radar" },
      { property: "og:description", content: "Evidence → reason → opportunity → missing proof → next action." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Draft = {
  id?: string;
  text: string;
  type: FactType;
  source: string;
  confirmed: boolean;
  evidenceDate: string;
  checkedDate: string;
  impactResult?: string | undefined;
  impactUnit?: string | undefined;
  impactPeriod?: string | undefined;
  impactBaseline?: string | undefined;
  trl?: number | undefined;
  sourceExcerpt?: string | undefined;
  verificationSource?: string | undefined;
  origin?: "manual" | "ai" | "sample" | undefined;
  verificationNeed?: string | undefined;
};
const dv = (a: number | null, b: number | null) => a === null || b === null ? 0 : a - b;

const today = () => new Date().toISOString().slice(0, 10);
const isUrl = (s: string) => /^https?:\/\//i.test(s.trim());

const SECTIONS = [
  ["overview", "Overview"],
  ["decision", "Decision"],
  ["readiness", "Readiness"],
  ["evidence", "Evidence"],
  ["opportunities", "Opportunities"],
] as const;
const SECTION_IDS = SECTIONS.map(([id]) => id);

const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

function Index() {
  const [selectedId, setSelectedId] = useState(STARTUPS[0]!.id);
  const [userFacts, setUserFacts] = useState<Record<string, Fact[]>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newStartupOpen, setNewStartupOpen] = useState(false);
  const [customStartups, setCustomStartups] = useState<Startup[]>([]);
  const allStartups = [...STARTUPS, ...customStartups];
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [openFact, setOpenFact] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState<"all" | "confirmed" | "review">("all");
  const [flashOpp, setFlashOpp] = useState<string | null>(null);
  const activeSection = useScrollSpy(SECTION_IDS);

  // Load saved facts after hydration.
  useEffect(() => {
    const all: Record<string, Fact[]> = {};
    let saved: Startup[] = [];
    try { const raw = JSON.parse(localStorage.getItem("oor:startups:v1") || "[]"); saved = Array.isArray(raw) ? raw.filter((s) => s && typeof s.id === "string" && typeof s.name === "string" && typeof s.country === "string" && typeof s.stage === "string" && Array.isArray(s.facts) && Array.isArray(s.focusAreas) && ["yes", "no", "unknown"].includes(s.canAttendHelsinki)) : []; } catch { /* Ignore invalid saved profiles. */ }
    setCustomStartups(saved);
    for (const st of [...STARTUPS, ...saved]) all[st.id] = loadUserFacts(localStorage, st.id);
    setUserFacts(all);
    const sel = localStorage.getItem(SELECTED_KEY);
    if (sel && [...STARTUPS, ...saved].some((x) => x.id === sel)) setSelectedId(sel);
  }, []);

  const startup = allStartups.find((s) => s.id === selectedId) ?? STARTUPS[0]!;
  const added = userFacts[startup.id] ?? [];
  const facts = [...startup.facts, ...added];
  const s = useMemo(() => assess(startup, added), [startup, added]);
  const before = useMemo(() => assess(startup), [startup]);
  const changed = added.length > 0;
  const cmp = useMemo(() => compareAssessments(before, s, added), [before, s, added]);
  const pendingCount = added.filter((f) => !f.confirmed).length;
  const pendingPreview = useMemo(() => {
    let assessmentPreview: ReturnType<typeof previewPendingFact> = null;
    for (const fact of added.filter((f) => !f.confirmed)) {
      const preview = previewPendingFact(startup, added, fact.id);
      if (preview?.comparison.decisionChanged) return preview;
      if (!assessmentPreview && preview?.comparison.anyChange) assessmentPreview = preview;
    }
    return assessmentPreview;
  }, [startup, added]);
  const shiftOf = (id: string) => cmp.oppShifts.find((o) => o.id === id);
  const isDemo = startup.demo !== false;

  const setAdded = (next: Fact[]) => {
    setUserFacts((u) => ({ ...u, [startup.id]: next }));
    if (next.length) saveUserFacts(localStorage, startup.id, next);
    else clearUserFacts(localStorage, startup.id);
  };

  const selectStartup = (id: string) => {
    setSelectedId(id);
    localStorage.setItem(SELECTED_KEY, id);
  };

  const save = () => {
    if (!draft || !draft.text.trim() || confirmationError(draft)) return;
    const data = {
      ...draft,
      source: draft.source.trim(),
      checkedDate: draft.confirmed ? draft.checkedDate || today() : draft.checkedDate,
    };
    if (draft.id) setAdded(added.map((f) => (f.id === draft.id ? { ...f, ...data } : f)));
    else setAdded([...added, { ...data, id: `u${Date.now()}`, demo: startup.demo !== false, userAdded: true }]);
    setDraft(null);
    if (draft.confirmed) toast.success("Fact confirmed", { description: "The assessment now includes this evidence." });
    else toast("Saved for review", { description: "The assessment stays unchanged until you confirm it." });
  };

  const resetDemo = () => {
    setDraft(null);
    setOpenFact(null);
    setAdded([]);
    toast("Back to the starting evidence", { description: `${startup.name} is reset to its original facts.` });
  };

  const addEvidence = () =>
    setDraft({ text: startup.suggestedPilot, type: "paid_pilot", source: "", confirmed: false, evidenceDate: "", checkedDate: "" });

  const editFact = (f: Fact) => {
    setOpenFact(null);
    setDraft({
      id: f.id,
      text: f.text,
      type: f.type,
      source: f.source,
      confirmed: f.confirmed,
      evidenceDate: f.evidenceDate ?? "",
      checkedDate: f.checkedDate ?? "",
      impactResult: f.impactResult,
      impactUnit: f.impactUnit,
      impactPeriod: f.impactPeriod,
      impactBaseline: f.impactBaseline,
      trl: f.trl,
      sourceExcerpt: f.sourceExcerpt,
      verificationSource: f.verificationSource,
      origin: f.origin,
      verificationNeed: f.verificationNeed,
    });
  };

  const reviewResearchLead = (lead: ResearchLead) => {
    setResearchOpen(false);
    setDraft({
      text: lead.text,
      type: "other",
      source: lead.source,
      confirmed: false,
      evidenceDate: "",
      checkedDate: "",
      origin: "ai",
      verificationNeed: "Open the cited page and find direct support for this claim. This AI summary is not an exact source quote. Request independent documents for private claims.",
      verificationSource: "",
    });
  };

  const showOpp = (id: string) => {
    goTo(`opp-${id}`);
    setFlashOpp(id);
    window.setTimeout(() => setFlashOpp((current) => (current === id ? null : current)), 1800);
  };

  const factById = (id?: string) => facts.find((f) => f.id === id);
  const shown = factById(openFact ?? undefined);
  const isConfirmed = (f: Fact) => f.confirmed && !!s.effects[f.id];
  const visibleFacts = facts.filter((f) => evidenceFilter === "all" || (evidenceFilter === "confirmed") === isConfirmed(f));
  const confirmedCount = facts.filter((f) => f.confirmed && !confirmationError(f)).length;

  const commands: CommandAction[] = [
    ...allStartups.map((st) => ({
      id: `startup-${st.id}`, group: "Startups", label: st.name, icon: <Building2 />, active: st.id === startup.id,
      hint: st.demo === false ? "Your workspace" : "Demo", run: () => selectStartup(st.id),
    })),
    { id: "add-evidence", group: "Actions", label: "Add evidence", icon: <Plus />, run: addEvidence },
    { id: "read-pitch", group: "Actions", label: "Read pitch with AI", icon: <Sparkles />, run: () => setIntakeOpen(true) },
    { id: "research", group: "Actions", label: "Research online", icon: <Search />, run: () => setResearchOpen(true) },
    { id: "new-startup", group: "Actions", label: "New startup", icon: <Building2 />, run: () => setNewStartupOpen(true) },
    ...(changed ? [{ id: "reset", group: "Actions", label: "Reset demo", icon: <RotateCcw />, run: resetDemo }] : []),
    ...(pendingCount > 0 ? [{ id: "review", group: "Actions", label: "Review next claim", icon: <BadgeCheck />, hint: `${pendingCount} waiting`, run: () => editFact(pendingPreview?.fact ?? added.find((f) => !f.confirmed)!) }] : []),
    ...SECTIONS.map(([id, label]) => ({ id: `go-${id}`, group: "Jump to", label, icon: <ArrowRight />, run: () => goTo(id) })),
    ...s.opps.map((m, i) => ({ id: `opp-${m.opp.id}`, group: "Opportunities", label: m.opp.name, icon: <Compass />, hint: `#${i + 1}`, run: () => showOpp(m.opp.id) })),
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="glass sticky top-0 z-40 border-b border-black/[0.06]">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 sm:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="press flex min-w-0 items-center gap-2.5 rounded-full" aria-label="Ocean Opportunity Radar — back to top">
            <LogoMark className="h-7 w-7 shrink-0" />
            <span className="truncate text-[15px] font-semibold tracking-tight">Ocean Opportunity Radar</span>
          </button>
          <nav aria-label="Sections" className="ml-auto hidden items-center gap-0.5 lg:flex">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} aria-current={activeSection === id ? "true" : undefined}
                className={`rounded-full px-3 py-1.5 text-[13px] transition-colors duration-300 ${activeSection === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                {label}
              </a>
            ))}
          </nav>
          <button onClick={() => setMenuOpen(true)} aria-label="Open command menu"
            className="press ml-auto flex h-9 shrink-0 items-center gap-2 rounded-full bg-foreground/[0.06] pl-3 pr-1.5 text-[13px] text-muted-foreground hover:bg-foreground/10 hover:text-foreground lg:ml-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="flex items-center gap-0.5 rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-foreground shadow-sm"><CommandIcon className="h-3 w-3" />K</kbd>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 pb-24 pt-5 sm:px-8 sm:pt-8">
        <div className="flex items-center gap-2">
          <StartupSwitcher startups={allStartups} selectedId={startup.id} onSelect={selectStartup} hasChanges={(id) => (userFacts[id]?.length ?? 0) > 0} />
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setNewStartupOpen(true)}><Plus /> <span className="hidden sm:inline">New startup</span></Button>
        </div>

        <div key={startup.id} className="animate-rise-in">
          <section id="overview" aria-label={`${startup.name} overview`} className="abyss-panel relative mt-5 overflow-hidden rounded-[36px] text-white shadow-lift">
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-[oklch(0.62_0.13_200/0.35)] blur-3xl motion-safe:animate-[drift-a_16s_ease-in-out_infinite]" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-[28rem] w-[28rem] rounded-full bg-[oklch(0.55_0.16_255/0.35)] blur-3xl motion-safe:animate-[drift-b_20s_ease-in-out_infinite]" />
            <Waves />
            <div className="relative grid gap-8 p-6 pb-20 sm:p-10 sm:pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-6 lg:p-14 lg:pb-24">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-lagoon ring-1 ring-white/15">
                    {isDemo ? "Demo data" : "Your workspace"}
                  </span>
                  <span className="text-xs text-white/60">{isDemo ? "Fictional startup and evidence for demonstration" : "Analyst-entered profile · saved in this browser"}</span>
                </div>
                <h1 className="mt-6 break-words text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-7xl">{startup.name}</h1>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl">{startup.tagline}</p>
                <div className="mt-7 max-w-xl">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">{isDemo ? "Demo profile" : "Company profile"}</p>
                  <dl className="mt-2 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10">
                    {([["Country", startup.country], ["Stage", startup.stage], ["Can attend in Helsinki", startup.canAttendHelsinki]] as const).map(([k, v]) => (
                      <div key={k} className="min-w-0 bg-[oklch(0.17_0.035_252/0.55)] p-3 sm:p-4">
                        <dt className="text-[11px] leading-tight text-white/50">{k}</dt>
                        <dd className="mt-1 truncate text-sm font-semibold capitalize sm:text-[15px]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="mt-8 flex flex-wrap gap-2.5">
                  <HeroButton primary onClick={() => setIntakeOpen(true)}><Sparkles /> Read pitch with AI</HeroButton>
                  <HeroButton onClick={() => setResearchOpen(true)}><Search /> Research online</HeroButton>
                  <HeroButton onClick={addEvidence}><Plus /> Add evidence</HeroButton>
                  {changed && <HeroButton subtle onClick={resetDemo}><RotateCcw /> Reset demo</HeroButton>}
                </div>
              </div>
              <div>
                <RadarScope opps={s.opps} notNow={s.notNow} onSelect={showOpp} />
                <p className="mt-3 text-center text-xs text-white/55">
                  {s.opps.length} ranked {s.opps.length === 1 ? "match" : "matches"} · {s.notNow.length} not actionable now · select a contact
                </p>
              </div>
            </div>
          </section>

          {pendingCount > 0 && <div role="status" className="animate-rise-in mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-primary/15 bg-card p-5 shadow-soft">
            <div className="flex min-w-0 flex-1 gap-3">
              <span className="relative mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-primary">
                <BadgeCheck className="h-4.5 w-4.5" />
                <span className="absolute -right-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{pendingCount}</span>
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">{pendingCount} claim(s) waiting for your review. Current assessment is unchanged.</p>
                {pendingPreview && <div className="mt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">If independently verified · preview only</p>
                  <p className="mt-0.5 font-semibold">
                    {pendingPreview.before.opps[0]?.opp.name !== pendingPreview.after.opps[0]?.opp.name
                      ? `Priority could move: ${pendingPreview.before.opps[0]?.opp.name ?? "None"} → ${pendingPreview.after.opps[0]?.opp.name ?? "None"}`
                      : `Assessment could change; current top stays ${pendingPreview.after.opps[0]?.opp.name ?? "unavailable"}`}
                    {pendingPreview.before.brl.value !== pendingPreview.after.brl.value
                      ? ` · BRL ${pendingPreview.before.brl.value ?? "unknown"} → ${pendingPreview.after.brl.value ?? "unknown"}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Evidence to request: {pendingPreview.fact.verificationNeed || "Independent supporting evidence for this claim."}</p>
                  {pendingPreview.fact.type === "paid_pilot" && pendingPreview.after.opps[0]?.opp.id === "redstone-blue" &&
                    <p className="mt-1 text-xs text-muted-foreground">Paying-customer proof is our ranking preference, not a published Redstone requirement.</p>}
                </div>}
              </div>
            </div>
            <Button onClick={() => editFact(pendingPreview?.fact ?? added.find((f) => !f.confirmed)!)}>Review next claim <ArrowRight /></Button>
          </div>}

          <Reveal id="decision" className="mt-6 scroll-mt-24">
            <DecisionHero before={before} after={s} comparison={cmp} factById={factById} onOpenFact={setOpenFact} />
            {changed && (
              <details className="smooth group mt-3 rounded-[28px] border border-border/70 bg-card px-6 py-4 shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-primary">
                  Inspect what changed and why
                  <ChevronDown className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <DecisionPanel cmp={cmp} s={s} factById={factById} onOpenFact={setOpenFact} />
              </details>
            )}
          </Reveal>

          <Reveal as="section" id="readiness" aria-label="Readiness" className="mt-24 scroll-mt-24">
            <SectionHead eyebrow="Readiness" title="Where it stands today." text="Scores move only when analyst-confirmed evidence changes them." />
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Readiness icon={<FlaskConical />} label="Technology readiness" short="TRL" tone="ocean" m={s.trl} delta={dv(s.trl.value, before.trl.value)} />
              <Readiness icon={<TrendingUp />} label="Business readiness" short="BRL" tone="lagoon" m={s.brl} delta={dv(s.brl.value, before.brl.value)} badge="Prototype's simplified internal estimate — not an official scale" />
              <Readiness icon={<Landmark />} label="Investor readiness" short="Checklist" tone="sun" m={s.irl} delta={dv(s.irl.value, before.irl.value)} badge="This app's own checklist — not an official scale" />
              <div className="lift flex flex-col rounded-[28px] border border-border/70 bg-card p-6 shadow-soft">
                <TileHead icon={<Fish />} label="Measured ocean impact" />
                <p aria-hidden="true" className="mt-3 min-h-[2.6em] text-[10.5px] leading-snug" />
                <div className="mt-5 flex flex-1 flex-col">
                  <span className={`grid h-14 w-14 place-items-center rounded-2xl ${s.oceanImpact.measured ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                    {s.oceanImpact.measured ? <CircleCheck className="h-7 w-7" /> : <CircleAlert className="h-7 w-7" />}
                  </span>
                  <p className={`mt-4 text-2xl font-semibold tracking-tight ${s.oceanImpact.measured ? "" : "text-warning"}`}>{s.oceanImpact.value}</p>
                </div>
                <Reasons
                  reasons={
                    s.oceanImpact.reasons.length
                      ? s.oceanImpact.reasons
                      : [{ text: "No confirmed measurement with result, unit, period or baseline, and source. Commercial facts do not change this." }]
                  }
                />
              </div>
            </div>
          </Reveal>

          <div className="mt-24 grid grid-cols-1 gap-6 lg:grid-cols-[5fr_6fr]">
            <Reveal as="section" id="evidence" aria-label="Evidence inbox" className="scroll-mt-24">
              <SectionHead eyebrow="Evidence" title="What we know." text="Review claims, inspect sources, then confirm the evidence." />
              <div className="mt-8 rounded-[28px] border border-border/70 bg-card p-5 shadow-soft sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Evidence inbox</h3>
                  <span className="text-sm text-muted-foreground">{confirmedCount} confirmed · {isDemo ? "Demo data" : "Your data"}</span>
                </div>
                <div role="tablist" aria-label="Filter evidence" className="mt-4 inline-flex rounded-full bg-muted p-1 text-[13px]">
                  {([["all", "All"], ["confirmed", "Confirmed"], ["review", "To review"]] as const).map(([key, label]) => (
                    <button key={key} role="tab" aria-selected={evidenceFilter === key} onClick={() => setEvidenceFilter(key)}
                      className={`press rounded-full px-3.5 py-1.5 font-medium ${evidenceFilter === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <ul className="mt-4 space-y-1">
                  {visibleFacts.map((f) => {
                    const eff = s.effects[f.id];
                    const drives = cmp.changingFactIds.includes(f.id);
                    return (
                      <li key={f.id} className={`group flex gap-3 rounded-2xl p-3 transition-colors duration-300 hover:bg-muted/70 ${f.userAdded ? "animate-rise-in" : ""} ${drives ? "bg-accent ring-1 ring-primary/25 hover:bg-accent" : ""}`}>
                        {f.confirmed && eff ? (
                          <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                        ) : (
                          <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                        )}
                        <button className="min-w-0 flex-1 text-left" onClick={() => setOpenFact(f.id)}>
                          <p className="text-[15px] font-medium leading-snug break-words">
                            {f.text}
                            {f.userAdded && (
                              <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 align-middle text-[10px] font-bold tracking-wide text-success">NEW</span>
                            )}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground break-words">
                            {FACT_TYPE_LABELS[f.type]} · Source: {f.source || "—"}
                          </p>
                          {eff ? (
                            <p className="mt-1 text-xs font-medium text-primary">{eff.join(" · ")}</p>
                          ) : (
                            <p className="mt-1 text-xs font-medium text-warning">Claim to review — does not change assessment</p>
                          )}
                        </button>
                        {f.userAdded && (
                          <button aria-label="Edit fact" onClick={() => editFact(f)}
                            className="press shrink-0 self-start rounded-full p-2 text-muted-foreground opacity-60 hover:bg-card hover:text-foreground group-hover:opacity-100">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                  {!s.hasPaidPilot && evidenceFilter !== "confirmed" && (
                    <li className="flex gap-3 rounded-2xl bg-warning-soft p-3">
                      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                      <div>
                        <p className="text-[15px] font-medium text-warning">Paid pilot — not confirmed</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Key missing proof</p>
                      </div>
                    </li>
                  )}
                  {!visibleFacts.length && (s.hasPaidPilot || evidenceFilter === "confirmed") && (
                    <li className="rounded-2xl bg-muted/60 p-6 text-center text-sm text-muted-foreground">Nothing here yet.</li>
                  )}
                </ul>
                <Button variant="outline" className="mt-4 w-full" onClick={addEvidence}><Plus /> Add evidence</Button>
              </div>
            </Reveal>

            <Reveal as="section" id="path" aria-label="Opportunity path" className="scroll-mt-24" delay={120}>
              <SectionHead eyebrow="Opportunity path" title="How we got here." text="How the recommendation is reasoned, step by step." />
              <ol key={startup.id + s.action} className="mt-8 rounded-[28px] border border-border/70 bg-card p-5 shadow-soft sm:p-6">
                <Step
                  n={1}
                  title="Evidence"
                  icon={<FileText />}
                  text={s.path.evidence}
                  highlight={s.path.evidenceFactIds.some((id) => cmp.changingFactIds.includes(id))}
                  extra={s.path.evidenceFactIds.map((id) => {
                    const f = factById(id);
                    return f ? (
                      <button key={id} onClick={() => setOpenFact(id)} className="mt-1.5 block text-left text-xs font-medium text-primary hover:underline">
                        Source: {f.source}
                        {f.evidenceDate ? ` · ${f.evidenceDate}` : ""}
                        {f.userAdded ? " · new" : ""}
                      </button>
                    ) : null;
                  })}
                />
                <Step n={2} title="Reason" icon={<Lightbulb />} text={s.path.reason} />
                <Step
                  n={3}
                  title="Opportunity"
                  icon={<Compass />}
                  text={s.path.opportunity}
                  extra={
                    s.opps[0] && (
                      <a href={s.opps[0].opp.sourceUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-block break-words text-xs font-medium text-primary hover:underline">
                        Official source ↗
                      </a>
                    )
                  }
                />
                <Step n={4} title="Missing proof / obstacle" icon={<CircleAlert />} text={s.path.missing} warn />
                <Step n={5} title="Next action" icon={<Target />} text={s.path.next} final />
              </ol>
            </Reveal>
          </div>

          <Reveal as="section" id="opportunities" aria-label="Matched opportunities" className="mt-24 scroll-mt-24">
            <SectionHead eyebrow="Opportunities" title="Matched opportunities." text="Real programmes from a shared catalog. Published requirements are checked first; only actionable, non-excluded options are ranked. Unknown information stays “unknown”." />
            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {s.opps.map((m, i) => (
                <OppCard key={`${startup.id}-${m.opp.id}`} m={m} rank={i + 1} shift={shiftOf(m.opp.id)} flash={flashOpp === m.opp.id} factText={(id) => factById(id)?.text} isDemo={isDemo} />
              ))}
            </div>
            {s.notNow.length > 0 && (
              <div className="mt-12">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Not actionable now</h3>
                <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {s.notNow.map((m) => (
                    <OppCard key={`${startup.id}-${m.opp.id}`} m={m} shift={shiftOf(m.opp.id)} flash={flashOpp === m.opp.id} factText={(id) => factById(id)?.text} isDemo={isDemo} />
                  ))}
                </div>
              </div>
            )}
          </Reveal>
        </div>
      </main>

      <footer className="border-t border-black/[0.06]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-8 text-xs text-muted-foreground sm:px-8">
          <div className="flex items-center gap-2.5"><LogoMark className="h-6 w-6" /><span>Ocean Opportunity Radar · Evidence-led decisions · Prototype</span></div>
          <button onClick={() => setMenuOpen(true)} className="press rounded-full px-2 py-1 hover:text-foreground">Press <kbd className="rounded-md border bg-card px-1.5 py-0.5 font-medium text-foreground">⌘K</kbd> to search</button>
        </div>
      </footer>

      <CommandMenu open={menuOpen} onOpenChange={setMenuOpen} actions={commands} />
      <NewStartup open={newStartupOpen} onClose={() => setNewStartupOpen(false)} onCreate={(newStartup) => { const next = [...customStartups, newStartup]; setCustomStartups(next); localStorage.setItem("oor:startups:v1", JSON.stringify(next)); selectStartup(newStartup.id); toast.success(`${newStartup.name} added`, { description: "Saved in this browser. Add evidence next." }); }} />
      <StartupResearch key={`research-${startup.id}`} open={researchOpen} onClose={() => setResearchOpen(false)} onReviewLead={reviewResearchLead} startupName={startup.name} isDemo={isDemo} />
      <ApplicationIntake key={`intake-${startup.id}`} open={intakeOpen} onClose={() => setIntakeOpen(false)} startupName={startup.name} onImport={(incoming) => { setAdded([...added, ...incoming.map((f) => ({ ...f, demo: f.origin === "sample" || startup.demo !== false }))]); setIntakeOpen(false); toast(`${incoming.length} claim(s) saved for review`, { description: "Scores stay unchanged until you confirm the evidence." }); }} />
      <FactDialog draft={draft} setDraft={setDraft} onSave={save} />

      <Dialog open={!!shown} onOpenChange={(o) => !o && setOpenFact(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {shown && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{shown.text}</DialogTitle>
                <DialogDescription>{shown.demo ? "Demo data · fictional evidence" : "Fact"}</DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Type</dt>
                <dd>{FACT_TYPE_LABELS[shown.type]}</dd>
                <dt className="text-muted-foreground">Source</dt>
                <dd className="break-words">
                  {isUrl(shown.source) ? (
                    <a href={shown.source} target="_blank" rel="noreferrer" className="text-primary underline">
                      {shown.source}
                    </a>
                  ) : (
                    shown.source || "—"
                  )}
                </dd>
                {shown.sourceExcerpt && <><dt className="text-muted-foreground">Original quote</dt><dd className="rounded-2xl bg-muted p-3">“{shown.sourceExcerpt}”</dd></>}
                {shown.verificationNeed && <><dt className="text-muted-foreground">Evidence to request</dt><dd>{shown.verificationNeed}</dd></>}
                {shown.verificationSource && <><dt className="text-muted-foreground">Checked evidence</dt><dd>{shown.verificationSource}</dd></>}
                <dt className="text-muted-foreground">Evidence date</dt>
                <dd>{shown.evidenceDate || "Not recorded"}</dd>
                <dt className="text-muted-foreground">Checked on</dt>
                <dd>{shown.checkedDate || "Not checked"}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{shown.confirmed && s.effects[shown.id] ? "Analyst-confirmed" : "Not confirmed — ignored"}</dd>
                <dt className="text-muted-foreground">Assessment effect</dt>
                <dd>{(s.effects[shown.id] ?? ["None (unconfirmed)"]).join(" · ")}</dd>
              </dl>
              {shown.userAdded && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => editFact(shown)}>
                    <Pencil /> Edit fact
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Segmented control with a sliding selection pill. */
function StartupSwitcher({ startups, selectedId, onSelect, hasChanges }: {
  startups: Startup[]; selectedId: string; onSelect: (id: string) => void; hasChanges: (id: string) => boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  useEffect(() => {
    const measure = () => {
      const el = track.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(selectedId)}"]`);
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (track.current) observer.observe(track.current);
    return () => observer.disconnect();
  }, [selectedId, startups.length]);
  return (
    <nav aria-label="Startups" className="no-scrollbar -ml-4 min-w-0 flex-1 overflow-x-auto pl-4 sm:ml-0 sm:pl-0">
      <div ref={track} className="relative inline-flex gap-0.5 rounded-full bg-foreground/[0.055] p-1">
        {pill && <span aria-hidden="true" className="absolute top-1 bottom-1 rounded-full bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06),0_4px_12px_-4px_rgb(0_0_0/0.18)] transition-[left,width] duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)]" style={{ left: pill.left, width: pill.width }} />}
        {startups.map((st) => {
          const active = st.id === selectedId;
          return (
            <button key={st.id} data-id={st.id} onClick={() => onSelect(st.id)} aria-pressed={active}
              className={`press relative z-10 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {st.name}
              {hasChanges(st.id) && <span className="ml-1.5 inline-block h-1.5 w-1.5 -translate-y-0.5 rounded-full bg-primary" aria-label="has new evidence" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function HeroButton({ children, onClick, primary, subtle }: { children: ReactNode; onClick: () => void; primary?: boolean; subtle?: boolean }) {
  return (
    <button onClick={onClick}
      className={`press inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-semibold [&_svg]:h-4 [&_svg]:w-4 ${primary
        ? "bg-white text-abyss shadow-[0_10px_30px_-10px_oklch(0.85_0.12_190/0.8)] hover:bg-white/90"
        : subtle ? "text-white/70 hover:bg-white/10 hover:text-white" : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/[0.16]"}`}>
      {children}
    </button>
  );
}

/** Animated waterline along the bottom of the hero. */
function Waves() {
  const path = "M0 30 C 150 0, 300 60, 450 30 S 750 0, 900 30 S 1200 60, 1350 30 S 1650 0, 1800 30 V 80 H 0 Z";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 overflow-hidden">
      <svg viewBox="0 0 1800 80" preserveAspectRatio="none" className="absolute bottom-0 h-full w-[200%] motion-safe:animate-[wave-x_18s_linear_infinite]">
        <path d={path} fill="oklch(0.62 0.12 200 / 0.18)" />
      </svg>
      <svg viewBox="0 0 1800 80" preserveAspectRatio="none" className="absolute -bottom-2 h-[85%] w-[200%] motion-safe:animate-[wave-x_11s_linear_infinite_reverse]">
        <path d={path} fill="oklch(0.75 0.11 192 / 0.14)" />
      </svg>
    </div>
  );
}

function SectionHead({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 className="mt-1.5 text-[2rem] font-semibold leading-[1.1] tracking-tight sm:text-[2.6rem]">{title}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:text-base">{text}</p>
    </div>
  );
}

function TileHead({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-primary [&_svg]:h-[18px] [&_svg]:w-[18px]">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

function FactDialog({
  draft,
  setDraft,
  onSave,
}: {
  draft: Draft | null;
  setDraft: (d: Draft | null) => void;
  onSave: () => void;
}) {
  if (!draft) return <Dialog open={false} />;
  const d = draft;
  const set = (patch: Partial<Draft>) => setDraft({ ...d, ...patch });
  const err = confirmationError(d);
  const noSource = !d.source.trim();
  return (
    <Dialog open onOpenChange={(o) => !o && setDraft(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{d.id ? "Review claim" : "Add claim to review"}</DialogTitle>
          <DialogDescription>Check the original source and supporting evidence before confirming. AI summaries and founder claims alone are not proof.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {d.sourceExcerpt && <blockquote className="rounded-xl bg-secondary p-3 text-sm"><span className="mb-1 block text-xs font-semibold text-primary">Original source quote</span>“{d.sourceExcerpt}”</blockquote>}
          {d.verificationNeed && <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning"><strong>Evidence to check: </strong>{d.verificationNeed}</p>}
          <div className="space-y-1.5">
            <Label htmlFor="fact-text">Fact</Label>
            <Textarea id="fact-text" value={d.text} onChange={(e) => set({ text: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={d.type} onValueChange={(v) => set({ type: v as FactType })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FACT_TYPE_LABELS) as FactType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {FACT_TYPE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fact-source">Source description or URL (required to confirm)</Label>
            <Input id="fact-source" value={d.source} onChange={(e) => set({ source: e.target.value })} />
          </div>
          {(d.origin === "ai" || d.origin === "sample") && <div className="space-y-1.5"><Label htmlFor="fact-verification">Supporting evidence you inspected (required to confirm)</Label><Input id="fact-verification" value={d.verificationSource ?? ""} onChange={(e) => set({ verificationSource: e.target.value })} placeholder="Signed agreement, test report, payment record…" /></div>}
          {d.type === "technical_test" && (
            <div className="space-y-1.5 rounded-xl border border-border p-3">
              <Label>Technology readiness level shown by this test</Label>
              <Select value={d.trl ? String(d.trl) : "none"} onValueChange={(v) => set({ trl: v === "none" ? undefined : Number(v) })}>
                <SelectTrigger aria-label="TRL">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not chosen yet</SelectItem>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      TRL {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                You choose the level based on the evidence — the app never infers TRL from the text. Without a level the
                fact is saved but TRL does not change.
              </p>
            </div>
          )}
          {d.type === "ocean_impact" && (
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-border p-3 sm:grid-cols-2">
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Counts as measured only with a result, unit, period or baseline, and a source. Otherwise shown as
                “measurement needed”.
              </p>
              {(
                [
                  ["impactResult", "Result (e.g. 14)"],
                  ["impactUnit", "Unit (e.g. nets recovered)"],
                  ["impactPeriod", "Period"],
                  ["impactBaseline", "Baseline"],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={`fact-${k}`}>{label}</Label>
                  <Input id={`fact-${k}`} value={d[k] ?? ""} onChange={(e) => set({ [k]: e.target.value } as Partial<Draft>)} />
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fact-evidence-date">Date of evidence</Label>
              <Input id="fact-evidence-date" type="date" value={d.evidenceDate} onChange={(e) => set({ evidenceDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fact-checked-date">Date checked</Label>
              <Input id="fact-checked-date" type="date" value={d.checkedDate} onChange={(e) => set({ checkedDate: e.target.value })} />
            </div>
          </div>
          <label className={`flex items-start gap-3 rounded-xl border border-border bg-muted p-3 text-sm ${noSource && !d.confirmed ? "opacity-60" : ""}`}>
            <Checkbox
              checked={d.confirmed}
              disabled={noSource && !d.confirmed}
              onCheckedChange={(c) =>
                set({ confirmed: c === true, checkedDate: c === true && !d.checkedDate ? today() : d.checkedDate })
              }
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">I have checked this against the source</span>
              <span className="block text-muted-foreground">
                {noSource ? "Add a source first." : "Analyst-confirmed. Unconfirmed facts are stored but ignored."}
              </span>
            </span>
          </label>
          {err && <p className="text-sm font-medium text-destructive">{err}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setDraft(null)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!d.text.trim() || !!err}>
            <BadgeCheck /> {d.confirmed ? "Save confirmed fact" : "Save for review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Reasons({ reasons }: { reasons: { text: string }[] }) {
  return (
    <details className="smooth group mt-4 border-t border-border/70 pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground">
        Show reasoning
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
        {reasons.map((r, i) => (
          <li key={i} className="break-words">• {r.text}</li>
        ))}
      </ul>
    </details>
  );
}

function Readiness(p: { icon: ReactNode; label: string; short: string; m: Metric; delta: number; badge?: string; tone: "ocean" | "lagoon" | "sun" }) {
  return (
    <div className="lift flex flex-col rounded-[28px] border border-border/70 bg-card p-6 shadow-soft">
      <TileHead icon={p.icon} label={p.label} />
      <p className="mt-3 min-h-[2.6em] text-[10.5px] font-semibold uppercase leading-snug tracking-wide text-warning">{p.badge}</p>
      <div className="mt-5 flex items-center gap-4">
        <Gauge value={p.m.value} max={p.m.max} label={`${p.label} (${p.short})`} tone={p.tone} size={108} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">{p.short}</p>
          {p.delta > 0 && (
            <span className="mt-1.5 inline-flex animate-rise-in rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-bold text-success">+{p.delta}</span>
          )}
        </div>
      </div>
      <p className="mt-5 flex-1 text-sm leading-snug">{p.m.summary}</p>
      <Reasons reasons={p.m.reasons} />
    </div>
  );
}

function Change({ label, a, b }: { label: string; a: string; b: string }) {
  const same = a === b;
  return (
    <li className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex flex-wrap items-center gap-2">
        <span className={same ? "font-medium" : "text-muted-foreground line-through"}>{a}</span>
        {!same && (
          <>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
            <span className="font-semibold text-primary">{b}</span>
          </>
        )}
        {same && <span className="text-xs text-muted-foreground">(unchanged)</span>}
      </span>
    </li>
  );
}

function Step(p: { n: number; title: string; icon: ReactNode; text: string; warn?: boolean; highlight?: boolean; final?: boolean; extra?: ReactNode }) {
  const dot = p.final
    ? "bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_var(--primary)]"
    : p.warn
      ? "bg-warning-soft text-warning"
      : p.highlight
        ? "bg-primary/15 text-primary ring-2 ring-primary/30"
        : "bg-accent text-primary";
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full [&_svg]:h-[18px] [&_svg]:w-[18px] ${dot}`}>{p.icon}</span>
        {!p.final && <span aria-hidden="true" className="my-1 w-0.5 flex-1 rounded-full bg-gradient-to-b from-primary/30 to-border" />}
      </div>
      <div className={`min-w-0 flex-1 ${p.final ? "abyss-panel -mt-1 rounded-2xl p-4 text-white" : "pb-6 pt-1.5"}`}>
        <p className={`text-[11px] font-semibold uppercase tracking-wider ${p.final ? "text-lagoon" : p.warn ? "text-warning" : "text-muted-foreground"}`}>{p.n}. {p.title}</p>
        <p className={`mt-1 text-[15px] leading-snug ${p.final ? "font-semibold" : ""}`}>{p.text}</p>
        {p.extra}
      </div>
    </li>
  );
}

const CHECK_STYLE = { met: "text-success", not_met: "text-destructive", unknown: "text-warning" } as const;
const CHECK_LABEL = { met: "Met", not_met: "Not met", unknown: "Unknown" } as const;

function OppCard({
  m,
  rank,
  shift,
  flash,
  factText,
  isDemo,
}: {
  m: OppMatch;
  rank?: number;
  shift?: OppShift | undefined;
  flash?: boolean;
  factText: (id: string) => string | undefined;
  isDemo: boolean;
}) {
  const o = m.opp;
  const muted = !rank;
  const badge =
    m.eligibility === "excluded"
      ? ["Excluded", "bg-muted text-muted-foreground"]
      : !m.actionable
        ? ["Closed", "bg-muted text-muted-foreground"]
        : m.eligibility === "needs_verification"
          ? ["Verify eligibility", "bg-warning-soft text-warning"]
          : ["Initial checks passed", "bg-success-soft text-success"];
  return (
    <article
      id={`opp-${o.id}`}
      className={`lift relative flex scroll-mt-24 flex-col rounded-[28px] border bg-card p-6 shadow-soft transition-[box-shadow,transform,border-color] ${
        shift ? "border-primary/40 ring-1 ring-primary/15" : "border-border/70"
      } ${flash ? "ring-4 ring-lagoon/70" : ""} ${muted ? "bg-card/70" : ""}`}
    >
      {shift && (
        <p className="mb-4 inline-flex w-fit animate-rise-in rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          {shift.beforeRank !== shift.afterRank
            ? `Moved ${shift.beforeRank ? `#${shift.beforeRank}` : "not ranked"} → ${shift.afterRank ? `#${shift.afterRank}` : "not ranked"}`
            : "Requirement check changed"}
        </p>
      )}
      <div className="flex items-start justify-between gap-3">
        {rank
          ? <span aria-hidden="true" className="bg-gradient-to-b from-foreground/25 to-foreground/[0.04] bg-clip-text text-6xl font-semibold leading-[0.85] tracking-tighter text-transparent">{String(rank).padStart(2, "0")}</span>
          : <span />}
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badge[1]}`}>
          {badge[0]}
          {rank ? ` · ${m.score} pts` : ""}
        </span>
      </div>
      <span className={`block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${rank ? "mt-4" : "mt-1"}`}>
        {rank ? `#${rank} · ` : ""}
        {o.type}
      </span>
      <h4 className="mt-1 text-xl font-semibold leading-tight tracking-tight">{o.name}</h4>

      <dl className="mt-5 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-2xl bg-muted/60 p-4 text-xs">
        <dt className="text-muted-foreground">Status</dt>
        <dd className="font-semibold">{m.statusLabel}</dd>
        <dt className="text-muted-foreground">Deadline</dt>
        <dd>{o.deadline ? fmtDate(o.deadline) : o.status === "rolling" ? "Rolling — no single deadline" : "unknown"}</dd>
        <dt className="text-muted-foreground">Focus</dt>
        <dd>{o.focusAreas.join(", ")}</dd>
        <dt className="text-muted-foreground">Geography</dt>
        <dd>{o.geography}</dd>
        <dt className="text-muted-foreground">Stage</dt>
        <dd>{o.stage}</dd>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{o.statusNote}</p>

      <p className="mt-4 flex gap-2 text-[15px] font-semibold leading-snug"><Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{m.action}</p>

      <details className="smooth group mt-5 border-t border-border/70 pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <span>
            Published requirements ·{" "}
            {(["met", "unknown", "not_met"] as const)
              .map((k) => [k, m.checks.filter((c) => c.result === k).length] as const)
              .filter(([, n]) => n > 0)
              .map(([k, n]) => `${n} ${CHECK_LABEL[k].toLowerCase()}`)
              .join(", ") || "none listed"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-open:rotate-180" />
        </summary>
        {shift?.checkChanges.map((c) => (
          <p key={c} className="mt-2 text-xs font-medium text-primary">Changed: {c}</p>
        ))}
        <ul className="mt-2 space-y-2 text-xs">
          {m.checks.map((c) => (
            <li key={c.label}>
              <span className={`font-semibold ${CHECK_STYLE[c.result]}`}>{CHECK_LABEL[c.result]}</span> · {c.label}
              <span className="block text-muted-foreground">
                {c.detail}. Source says: {c.quote}
              </span>
            </li>
          ))}
          {o.publishedPreferences.map((p) => (
            <li key={p} className="text-muted-foreground">Published preference (not required): {p}</li>
          ))}
          {o.publishedTerms.map((p) => (
            <li key={p} className="text-muted-foreground">Published terms: {p}</li>
          ))}
        </ul>
      </details>

      {m.analystPrefs.length > 0 && (
        <div className="mt-3 rounded-2xl bg-accent/70 p-3 text-xs">
          <p className="font-semibold">Our analyst’s preference — not a requirement of {o.name}</p>
          {m.analystPrefs.map((p) => (
            <p key={p.label} className="mt-0.5 text-muted-foreground">
              {p.met ? "✓" : "✗"} {p.label}
            </p>
          ))}
        </div>
      )}

      {rank && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why this rank</p>
          <ul className="mt-2 space-y-1.5 text-xs">
            {m.reasons.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className={`grid h-5 min-w-8 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-bold ${r.points > 0 ? "bg-primary/10 text-primary" : r.points < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{r.points > 0 ? `+${r.points}` : r.points}</span>
                <span className="min-w-0 leading-5">
                  <span className="font-medium">{r.factor}:</span> {r.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1" />
      <div className="mt-5 space-y-1 border-t border-border/70 pt-3 text-xs">
        <p>
          <span className="text-muted-foreground">Startup facts used: </span>
          {m.supportingFactIds.length
            ? m.supportingFactIds.map((id) => factText(id) ?? id).join("; ")
            : `${isDemo ? "Demo" : "Analyst-entered"} profile only (topic, stage, country, Helsinki attendance)`}
        </p>
        <p className="break-words">
          <span className="text-muted-foreground">Official source: </span>
          <a href={o.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
            {o.sourceUrl.replace(/^https?:\/\//, "")}
          </a>{" "}
          <span className="text-muted-foreground">· checked {fmtDate(o.checkedDate)}</span>
        </p>
      </div>
    </article>
  );
}

function DecisionPanel({
  cmp,
  s,
  factById,
  onOpenFact,
}: {
  cmp: Comparison;
  s: Assessment;
  factById: (id?: string) => Fact | undefined;
  onOpenFact: (id: string) => void;
}) {
  const top = s.opps[0];
  const rankReason = top?.reasons.find((r) => r.factId && cmp.changingFactIds.includes(r.factId)) ?? top?.reasons[0];
  return (
    <section aria-label="Before and after" className="mt-4 animate-rise-in border-t border-border/70 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            cmp.decisionChanged ? "bg-success-soft text-success" : cmp.anyChange ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {cmp.decisionChanged ? "Decision changed" : cmp.anyChange ? "Assessment changed" : "Nothing changed"}
        </span>
        <p className="text-sm text-muted-foreground">{cmp.summary}</p>
      </div>

      <div className="mt-4 space-y-2">
        {cmp.changingFactIds.map((id) => {
          const f = factById(id)!;
          return (
            <button
              key={id}
              onClick={() => onOpenFact(id)}
              className="press block w-full rounded-2xl bg-accent p-3.5 text-left text-sm ring-1 ring-primary/25 hover:ring-primary/45"
            >
              <span className="font-semibold">New fact: {f.text}</span>
              <span className="block text-xs text-muted-foreground">
                {FACT_TYPE_LABELS[f.type]} · Source: {f.source}
                {f.evidenceDate ? ` · evidence ${f.evidenceDate}` : ""}
                {f.checkedDate ? ` · checked ${f.checkedDate}` : ""} · Demo data
              </span>
            </button>
          );
        })}
        {cmp.inertFacts.map(({ id, why }) => (
          <p key={id} className="rounded-2xl bg-muted p-3.5 text-sm">
            <span className="font-medium">{factById(id)?.text}</span>
            <span className="block text-xs text-muted-foreground">{why}</span>
          </p>
        ))}
      </div>

      {cmp.anyChange && (
        <>
          <ul className="mt-4 divide-y divide-border text-sm">
            {cmp.rows.map((r) => (
              <Change key={r.label} label={r.label} a={r.before} b={r.after} />
            ))}
            {cmp.oppShifts.map((o) => (
              <li key={o.id} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
                <span className="text-muted-foreground">{o.name}</span>
                <span>
                  <span className="font-medium">
                    {o.beforeRank ? `#${o.beforeRank}` : "not ranked"} → {o.afterRank ? `#${o.afterRank}` : "not ranked"}
                  </span>
                  {o.checkChanges.map((c) => (
                    <span key={c} className="block text-xs text-primary">{c}</span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          {cmp.decisionChanged && top && (
            <p className="mt-4 rounded-2xl bg-muted p-3.5 text-xs">
              <span className="font-semibold">Why {top.opp.name} is now #1: </span>
              {rankReason ? `${rankReason.factor} — ${rankReason.text}. ` : ""}
              {top.analystPrefs.length > 0 && "Paying-customer preference is our analyst’s, not a published Redstone requirement. "}
              <a href={top.opp.sourceUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                Official source
              </a>{" "}
              <span className="text-muted-foreground">· checked {fmtDate(top.opp.checkedDate)}</span>
            </p>
          )}
        </>
      )}
    </section>
  );
}
