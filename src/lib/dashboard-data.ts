import type { Salon } from "@/lib/api";
import {
  getSalonServices,
  getSalonStylists,
  getStylistAvailability,
} from "@/lib/api-server";
import type { ChecklistInput } from "@/lib/setup-checklist";

/** Hours are read one stylist at a time, so the page reads at most this many. */
export const MAX_AVAILABILITY_READS = 20;

/**
 * Everything the setup checklist needs for one salon. Services and stylists
 * are public reads and must succeed (the page shows a retry if they do not).
 * Each stylist's weekly hours are a separate signed-in read; one that fails, or
 * lies past the limit, is counted as unchecked and never guessed.
 */
export async function loadChecklistInput(
  salon: Salon,
): Promise<ChecklistInput> {
  const [services, stylists] = await Promise.all([
    getSalonServices(salon.id),
    getSalonStylists(salon.id),
  ]);

  const results = await Promise.allSettled(
    stylists
      .slice(0, MAX_AVAILABILITY_READS)
      .map((stylist) => getStylistAvailability(stylist.id)),
  );
  const read = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );

  return {
    salon,
    services,
    stylists,
    availability: { read, unchecked: stylists.length - read.length },
  };
}
