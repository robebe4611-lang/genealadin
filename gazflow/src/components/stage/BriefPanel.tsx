import { X } from "lucide-react";
import { CLAUDE_BRIEF } from "@/lib/presentation/claude-brief";
import { Button } from "@/components/ui/button";

export function BriefPanel({
  open,
  copied,
  onClose,
  onCopy,
}: {
  open: boolean;
  copied: boolean;
  onClose: () => void;
  onCopy: () => void;
}) {
  if (!open) return null;
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex justify-end bg-void/70">
      <aside className="flex h-full w-full max-w-lg flex-col gap-4 overflow-hidden bg-navy p-5 shadow-border md:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-body text-xs font-semibold tracking-[0.16em] text-flame">
              חבילת הנחיות
            </p>
            <h2 className="mt-1 font-display text-2xl text-cream">בריף לקלוד</h2>
            <p className="mt-2 font-body text-sm text-muted">
              העתק והדבק כפי שהוא. העברית בתצוגה נעולה. בלי דשבורד, בלי סליקה, בלי בוט.
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="סגור" onClick={onClose}>
            <X />
          </Button>
        </div>
        <textarea
          readOnly
          value={CLAUDE_BRIEF}
          className="min-h-0 flex-1 resize-none rounded-lg bg-void p-4 font-body text-xs leading-normal text-cream shadow-border"
        />
        <div className="flex gap-2">
          <Button variant="flame" onClick={onCopy}>
            {copied ? "הועתק" : "העתק את הבריף"}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            סגור
          </Button>
        </div>
      </aside>
    </div>
  );
}
