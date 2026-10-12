import { getSalonNames } from "@/lib/api-server";
import { SALON_SUGGESTIONS_ID } from "@/lib/salon-search";

/**
 * Salon names for the search box's native suggestions. If the names cannot be
 * fetched it renders nothing and the search works exactly as before.
 */
export async function SalonNameSuggestions() {
  let names: string[];
  try {
    names = await getSalonNames();
  } catch {
    return null;
  }
  if (names.length === 0) return null;
  return (
    <datalist id={SALON_SUGGESTIONS_ID}>
      {names.map((name) => (
        <option key={name} value={name} />
      ))}
    </datalist>
  );
}
