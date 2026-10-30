import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/features/landing/Reveal";
import { SectionHeading } from "@/components/features/landing/SectionHeading";
import { FAQS } from "@/lib/landing-content";

export function FAQSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="flex flex-col gap-6"
    >
      <Reveal>
        <SectionHeading
          id="faq-heading"
          eyebrow="FAQ"
          title="Questions, answered"
        />
      </Reveal>
      <Reveal className="flex flex-col gap-3">
        {FAQS.map(({ question, answer }) => (
          <details
            key={question}
            className="group rounded-2xl border border-border bg-card"
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-3 font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              {question}
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 text-primary transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <p className="px-5 pb-4 text-base text-muted-foreground">
              {answer}
            </p>
          </details>
        ))}
      </Reveal>
    </section>
  );
}
