import { notFound } from "next/navigation";
import { isMissingResource } from "@/lib/api";
import { getSalon, getSalonServices, getSalonStylists } from "@/lib/api-server";

/**
 * A salon with its services and stylists, for server pages. Shows "not found"
 * when the salon id is missing or malformed; any other failure throws so the
 * route's error screen offers a retry.
 */
export async function loadSalonBundle(id: string) {
  // Start the lists right away so a cold backend is not hit twice in a row.
  // The no-op catch only marks them handled, in case the salon check throws
  // first; awaiting them below still rejects with the original error.
  const servicesRequest = getSalonServices(id);
  const stylistsRequest = getSalonStylists(id);
  servicesRequest.catch(() => {});
  stylistsRequest.catch(() => {});

  // Only the salon's own 404/422 means "not found". Failures of the lists
  // show the retry screen instead.
  const salon = await getSalon(id).catch((error: unknown) => {
    if (isMissingResource(error)) notFound();
    throw error;
  });
  const [services, stylists] = await Promise.all([
    servicesRequest,
    stylistsRequest,
  ]);
  return { salon, services, stylists };
}
