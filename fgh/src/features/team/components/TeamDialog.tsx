import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export default function TeamDialog({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="ts-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label={title} className="ts-dialog ts-team-dialog">
        <div className="ts-team-dialog-heading">
          <div><h2 className="text-lg font-semibold ts-text">{title}</h2><p className="mt-1 text-sm leading-6 ts-secondary">{description}</p></div>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="ts-icon-button ts-focus"><X size={18} /></button>
        </div>
        <div className="ts-team-dialog-content">{children}</div>
      </section>
    </div>
  );
}
