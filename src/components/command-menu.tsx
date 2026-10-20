import { useEffect, useState, type ReactNode } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Check, CornerDownLeft, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export type CommandAction = { id: string; label: string; group: string; icon?: ReactNode; hint?: string; active?: boolean; run: () => void };

/** Spotlight-style palette. Opens with ⌘K / Ctrl+K, or “/” when not typing. */
export function CommandMenu({ open, onOpenChange, actions }: {
  open: boolean; onOpenChange: (open: boolean) => void; actions: CommandAction[];
}) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName));
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing && !open)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);
  useEffect(() => { if (!open) setQuery(""); }, [open]);

  const groups = [...new Set(actions.map((a) => a.group))];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:p-0 [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <DialogDescription className="sr-only">Search for a startup, an action or a section.</DialogDescription>
        <CommandPrimitive loop className="flex flex-col">
          <div className="flex items-center gap-3 border-b px-5">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input value={query} onValueChange={setQuery} autoFocus placeholder="Search startups, actions and sections…"
              className="h-16 w-full bg-transparent text-[17px] outline-none placeholder:text-muted-foreground" />
            <kbd className="hidden rounded-md border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:block">esc</kbd>
          </div>
          <CommandPrimitive.List className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
            <CommandPrimitive.Empty className="px-3 py-10 text-center text-sm text-muted-foreground">No results for “{query}”.</CommandPrimitive.Empty>
            {groups.map((group) => (
              <CommandPrimitive.Group key={group} heading={group}>
                {actions.filter((a) => a.group === group).map((a) => (
                  <CommandPrimitive.Item key={a.id} value={`${a.group} ${a.label}`} onSelect={() => { onOpenChange(false); a.run(); }}
                    className="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-white/15 group-data-[selected=true]:text-white [&_svg]:h-4 [&_svg]:w-4">{a.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{a.label}</span>
                    {a.active && <Check className="h-4 w-4 shrink-0 opacity-70" />}
                    {a.hint && <span className="shrink-0 text-xs text-muted-foreground group-data-[selected=true]:text-white/70">{a.hint}</span>}
                    <CornerDownLeft className="hidden h-3.5 w-3.5 shrink-0 opacity-70 group-data-[selected=true]:block" />
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
