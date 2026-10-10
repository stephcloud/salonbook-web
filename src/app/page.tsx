import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

// Never prerender: the build must not call the API.
export const dynamic = "force-dynamic";
// The free-tier API can take about a minute to wake up.
export const maxDuration = 60;

// TEMPORARY home page: checks the backend is reachable. The landing page replaces it.
export default async function Home() {
  const health = await getHealth();

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12"
    >
      <h1 className="text-2xl font-bold">SalonBook</h1>
      <Card>
        <CardHeader>
          <CardTitle>Backend status</CardTitle>
          <CardDescription>Checked from the server just now.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          {health.ok ? (
            <Badge variant="confirmed">API is awake</Badge>
          ) : (
            <>
              <Badge variant="destructive">API error</Badge>
              <p role="alert">{health.message}</p>
              <Link href="/" prefetch={false} className={cn(buttonVariants())}>
                Try again
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
