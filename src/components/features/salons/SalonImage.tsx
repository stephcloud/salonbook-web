import Image from "next/image";
import { cn } from "@/lib/utils";

type SalonImageProps = {
  src: string | null;
  alt: string;
  className?: string;
};

/** Owner photo, or a soft pink gradient tile when there is none. */
export function SalonImage({ src, alt, className }: SalonImageProps) {
  return (
    <div
      className={cn(
        "relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-secondary via-secondary to-primary/30",
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
