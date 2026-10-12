import { Button } from "@/components/ui/button";

type PagerProps = {
  page: number;
  hasNext: boolean;
  busy: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export function Pager({ page, hasNext, busy, onPrevious, onNext }: PagerProps) {
  if (page === 1 && !hasNext) return null;
  return (
    <nav aria-label="Pages" className="flex items-center gap-3">
      <Button
        variant="outline"
        disabled={page === 1 || busy}
        onClick={onPrevious}
      >
        Previous
      </Button>
      <span aria-live="polite" className="text-sm text-muted-foreground">
        Page {page}
      </span>
      <Button variant="outline" disabled={!hasNext || busy} onClick={onNext}>
        Next
      </Button>
    </nav>
  );
}
