"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onClick() {
    setPending(true);
    setFailed(false);
    try {
      await authFetch("logout");
      router.replace("/login");
      router.refresh();
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        disabled={pending}
      >
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {failed ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          Could not sign out. Please try again.
        </p>
      ) : null}
    </div>
  );
}
