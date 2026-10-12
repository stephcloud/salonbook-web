import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-4 px-4 py-12"
    >
      <h1 className="text-xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">
        This page does not exist. The link may be wrong or the page may have
        moved.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/" className={buttonVariants()}>
          Home
        </Link>
        <Link href="/salons" className={buttonVariants({ variant: "outline" })}>
          Browse salons
        </Link>
      </div>
    </main>
  );
}
