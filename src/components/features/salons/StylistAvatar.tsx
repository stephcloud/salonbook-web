import Image from "next/image";
import { cn } from "@/lib/utils";

type StylistAvatarProps = {
  name: string;
  src: string | null;
  className?: string;
};

/** Stylist photo, or a round avatar with the first letter of their name. */
export function StylistAvatar({ name, src, className }: StylistAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={cn(
        "relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-lg font-bold text-primary-dark",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          unoptimized
          sizes="56px"
          className="object-cover"
        />
      ) : (
        <span aria-hidden="true" data-testid="stylist-initial">
          {initial}
        </span>
      )}
    </div>
  );
}
