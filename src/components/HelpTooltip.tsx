import { useId, useState } from "react";
import { Info } from "lucide-react";

export function HelpTooltip({ text }: { text: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <span className="help-tooltip" onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>
    <button type="button" aria-label="Mais informações" aria-expanded={open} aria-describedby={open ? id : undefined}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(true)}><Info size={16} /></button>
    {open && <span id={id} role="tooltip">{text}</span>}
  </span>;
}
