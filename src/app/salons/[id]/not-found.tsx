import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-4 px-4 py-12"
    >
      <h1 className="text-xl font-bold">Salon not found</h1>
      <p className="text-muted-foreground">
        This salon link may be wrong or the salon may have been removed.
      </p>
      <Link href="/salons" className={buttonVariants()}>
        Browse salons
      </Link>
    </main>
  );
}
