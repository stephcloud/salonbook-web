import Image from "next/image";
import { cn } from "@/lib/utils";

type SalonImageProps = {
  src: string | null;
  alt: string;
  className?: string;
};

/**
 * Owner photo, or a soft gradient tile when there is none. The empty tile is
 * shorter on phones (one card per row there, so heights need not match).
 */
export function SalonImage({ src, alt, className }: SalonImageProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-gradient-to-br from-secondary via-rose/40 to-primary/25",
        src ? "aspect-[16/10]" : "aspect-[3/1] sm:aspect-[16/10]",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      ) : (
        <div data-testid="salon-image-fallback" aria-hidden="true" />
      )}
    </div>
  );
}
