import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import type { Startup } from "@/lib/radar-rules";

export function NewStartup({ open, onClose, onCreate }: {
  open: boolean; onClose: () => void; onCreate: (s: Startup) => void;
}) {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [country, setCountry] = useState("");
  const [stage, setStage] = useState("Unknown");
  const [focus, setFocus] = useState("Unknown");
  const [attend, setAttend] = useState<Startup["canAttendHelsinki"]>("unknown");
  const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";
  return <Dialog open={open} onOpenChange={(v) => !v && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add a startup to your workspace</DialogTitle><DialogDescription>Start with the profile you know. Add evidence next. Your data is saved in this browser.</DialogDescription></DialogHeader>
    <div className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="new-name">Company name</Label><Input id="new-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="new-summary">What does it do?</Label><Textarea id="new-summary" rows={2} maxLength={500} value={tagline} onChange={(e) => setTagline(e.target.value)} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="new-country">Country of establishment</Label><Input id="new-country" value={country} maxLength={80} onChange={(e) => setCountry(e.target.value)} placeholder="Finland, Estonia, Norway…" /></div>
        <div className="space-y-1.5"><Label htmlFor="new-stage">Stage</Label><select id="new-stage" className={selectClass} value={stage} onChange={(e) => setStage(e.target.value)}>{["Unknown", "Pre-seed", "Seed", "Series A", "Growth"].map((s) => <option key={s}>{s}</option>)}</select></div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="new-focus">Main ocean focus</Label><select id="new-focus" className={selectClass} value={focus} onChange={(e) => setFocus(e.target.value)}>{["Blue Biotech & Water Innovation", "Marine Intelligence", "Ocean Infrastructure & Clean Energy", "Sustainable Maritime & Port Technology", "Unknown"].map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="space-y-1.5"><Label htmlFor="new-attend">Can the team attend in Helsinki?</Label><select id="new-attend" className={selectClass} value={attend} onChange={(e) => setAttend(e.target.value as typeof attend)}><option value="unknown">Not established yet</option><option value="yes">Yes — checked with the team</option><option value="no">No — checked with the team</option></select></div>
    </div>
    <Button disabled={!name.trim() || !tagline.trim()} onClick={() => {
      onCreate({ id: "startup-" + crypto.randomUUID(), name: name.trim(), tagline: tagline.trim(), country: country.trim() || "Unknown", stage, focusAreas: [focus], canAttendHelsinki: attend, facts: [], demo: false, pilotAction: "Request supporting evidence for customer demand and technical validation", suggestedPilot: "" });
      setName(""); setTagline(""); setCountry(""); onClose();
    }}>Create workspace</Button>
  </DialogContent></Dialog>;
}
