import { CalendarDays, LayoutDashboard, Scissors, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PlaceholderSlot = {
  /** The file name to use when the real picture exists. */
  file: string;
  /** Describes the picture that will replace the placeholder. */
  alt: string;
  /** Tailwind aspect ratio class, so the page does not shift when the image loads. */
  ratio: string;
  icon: LucideIcon;
};

/**
 * Every picture slot on the landing page, in one place. To use a real picture,
 * add the file under `public/images/landing/` and render it with `next/image`
 * inside `ImagePlaceholder` for that slot.
 */
export const PLACEHOLDERS = {
  heroDashboard: {
    file: "hero-salon-dashboard-placeholder.webp",
    alt: "Salon bookings dashboard",
    ratio: "aspect-[4/3]",
    icon: LayoutDashboard,
  },
  bookingCalendar: {
    file: "booking-calendar-placeholder.webp",
    alt: "Booking page showing free times",
    ratio: "aspect-[16/9]",
    icon: CalendarDays,
  },
  stylistAtWork: {
    file: "stylist-at-work-placeholder.webp",
    alt: "A stylist working with a client",
    ratio: "aspect-[4/3]",
    icon: Scissors,
  },
  salonInterior: {
    file: "salon-interior-placeholder.webp",
    alt: "Inside a salon",
    ratio: "aspect-[4/3]",
    icon: Store,
  },
} as const satisfies Record<string, PlaceholderSlot>;

export type PlaceholderKey = keyof typeof PLACEHOLDERS;
