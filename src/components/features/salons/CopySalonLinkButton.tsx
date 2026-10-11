"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type CopyState = "idle" | "copied" | "failed";

/** Copies this salon's public link so owners can share it with customers. */
export function CopySalonLinkButton({ salonId }: { salonId: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const [link, setLink] = useState("");

  async function copy() {
    const url = `${window.location.origin}/salons/${salonId}`;
    setLink(url);
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" size="lg" onClick={copy}>
        {state === "copied" ? (
          <Check aria-hidden="true" />
        ) : (
          <LinkIcon aria-hidden="true" />
        )}
        Copy salon link
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {state === "copied" ? "Link copied" : null}
      </p>
      {state === "failed" ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="salon-link" className="text-sm font-semibold">
            Copy this link
          </label>
          <input
            id="salon-link"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
          />
        </div>
      ) : null}
    </div>
  );
}
