import { PLACEHOLDERS, type PlaceholderKey } from "@/lib/landing-placeholders";
import { cn } from "@/lib/utils";

type ImagePlaceholderProps = { slot: PlaceholderKey; className?: string };

/**
 * A decorative tile for a picture that has not been supplied yet. It keeps the
 * final aspect ratio, so swapping in a real image causes no layout shift. The
 * `data-placeholder` attribute names the file that replaces it. Give the real
 * image a proper `alt` (see `PLACEHOLDERS`).
 */
export function ImagePlaceholder({ slot, className }: ImagePlaceholderProps) {
  const { file, icon: Icon, ratio } = PLACEHOLDERS[slot];

  return (
    <div
      aria-hidden="true"
      data-placeholder={file}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-secondary via-rose/30 to-secondary p-4",
        ratio,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-12 text-primary/70" />
    </div>
  );
}
