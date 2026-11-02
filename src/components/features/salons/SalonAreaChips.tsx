import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSalonAreas } from "@/lib/api-server";
import { normalizeSearch } from "@/lib/salon-search";

/**
 * Areas from real salon addresses. Each chip submits a plain GET form, so it
 * fills ?q= and filters the list without client JavaScript. The active chip
 * clears the search. If the areas cannot be fetched it renders nothing.
 */
export async function SalonAreaChips({ query }: { query: string }) {
  let areas: string[];
  try {
    areas = await getSalonAreas();
  } catch {
    return null;
  }
  if (areas.length === 0) return null;
  const active = normalizeSearch(query);
  return (
    <form method="get" action="/salons">
      <div
        role="group"
        aria-labelledby="salon-areas-label"
        className="flex flex-wrap items-center gap-2"
      >
        <span id="salon-areas-label" className="text-sm text-muted-foreground">
          Areas
        </span>
        {areas.map((area) => {
          const pressed = normalizeSearch(area) === active;
          return (
            <Button
              key={area}
              type="submit"
              name="q"
              value={pressed ? "" : area}
              aria-pressed={pressed}
              variant={pressed ? "outline" : "secondary"}
              // A visible edge on the soft chips (3:1), and a tick on the active one.
              className={`max-w-full whitespace-normal break-words${pressed ? "" : " border-input"}`}
            >
              {pressed ? <Check aria-hidden="true" /> : null}
              {area}
            </Button>
          );
        })}
      </div>
    </form>
  );
}
