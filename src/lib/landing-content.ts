import {
  CalendarClock,
  ClipboardList,
  Clock,
  Link2,
  Scissors,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type HomeAnchor = { href: string; label: string };

/** In-page links shown in the header on `/` only. */
export const HOME_ANCHORS: HomeAnchor[] = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export type Feature = { title: string; text: string; icon: LucideIcon };

/** Only things the app does today. Do not add a feature before it ships. */
export const FEATURES: Feature[] = [
  {
    title: "Real free times",
    text: "Clients see the slots a stylist is actually free, based on hours, breaks and days off.",
    icon: CalendarClock,
  },
  {
    title: "Deposits",
    text: "A deposit holds the booking, so a spot is kept for people who mean it.",
    icon: WalletCards,
  },
  {
    title: "Services and prices",
    text: "List your services with a price, or mark the price to be confirmed in person.",
    icon: Scissors,
  },
  {
    title: "Your stylists",
    text: "Add stylists and choose which services each one offers. They do not need an account.",
    icon: Users,
  },
  {
    title: "Weekly hours",
    text: "Set working hours, breaks and days off for each stylist.",
    icon: Clock,
  },
  {
    title: "Bookings list",
    text: "See bookings and filter them by status, stylist and date.",
    icon: ClipboardList,
  },
  {
    title: "Clear cancellations",
    text: "Clients see the refund rule before they cancel and the outcome after.",
    icon: ShieldCheck,
  },
  {
    title: "One link to share",
    text: "Every salon gets its own page and link to send to customers.",
    icon: Link2,
  },
];

export const BENEFITS: string[] = [
  "Clients book themselves, without waiting for a reply.",
  "Clients choose from the free times you set, not from a guess.",
  "A deposit is paid when the booking is made.",
  "Your bookings are in one list you can filter.",
];

export const CLIENT_STEPS = [
  "Pick a salon, a service and a stylist.",
  "Choose a free date and time.",
  "Pay the deposit to confirm your booking.",
];

export const OWNER_STEPS = [
  "Register and set up your salon, services and stylists.",
  "Set your weekly hours, breaks and days off.",
  "Share your salon link and watch bookings arrive.",
];

export type Faq = { question: string; answer: string };

export const FAQS: Faq[] = [
  {
    question: "How does a client book?",
    answer:
      "Sign in, choose a service and a stylist, pick a free time, then pay the deposit to confirm.",
  },
  {
    question: "How long is my spot held while I pay?",
    answer:
      "A pending booking is held for 15 minutes. If it is not paid in that time it is released. You can have up to 3 pending bookings at once.",
  },
  {
    question: "Do I get my deposit back if I cancel?",
    answer:
      "You get a refund if you cancel more than the salon's cancellation window before the start time. The window is explained before you confirm a cancellation.",
  },
  {
    question: "How does a salon owner get started?",
    answer:
      "Register as a salon owner, add your salon, services and stylists, set your weekly hours, then share your salon link.",
  },
  {
    question: "Do my stylists need accounts?",
    answer: "No. Owners create stylists, and stylists do not sign in.",
  },
  {
    question: "What does it cost?",
    answer: "Free while we launch, simple monthly plan later.",
  },
];
