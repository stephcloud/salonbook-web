import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { servicesKey } from "@/hooks/useSalonServices";
import { stylistsKey } from "@/hooks/useSalonStylists";
import { useCatalogRefresh } from "./useCatalogRefresh";

const SALON = "salon-1";

function setup() {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useCatalogRefresh(SALON), { wrapper });
  return { result, invalidate };
}

beforeEach(() => refresh.mockReset());

describe("useCatalogRefresh", () => {
  it("invalidates the services and stylists lists of that salon", async () => {
    const { result, invalidate } = setup();
    await result.current();
    const keys = invalidate.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(servicesKey(SALON));
    expect(keys).toContainEqual(stylistsKey(SALON));
  });

  it("asks the server to render again only after the lists were invalidated", async () => {
    const { result, invalidate } = setup();
    const releases: Array<() => void> = [];
    invalidate.mockImplementation(
      () => new Promise<void>((resolve) => void releases.push(resolve)),
    );
    const done = result.current();
    await Promise.resolve();
    expect(refresh).not.toHaveBeenCalled();
    releases.forEach((release) => release());
    await done;
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("still refreshes the page when re-reading a list fails", async () => {
    const { result, invalidate } = setup();
    invalidate.mockRejectedValue(new Error("network"));
    await result.current();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
