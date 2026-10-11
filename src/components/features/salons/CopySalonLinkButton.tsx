"use client";

import { useEffect, useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CopyState = "idle" | "copied" | "failed";

const COPIED_RESET_MS = 3000;

/** Copies this salon's public link so owners can share it with customers. */
export function CopySalonLinkButton({ salonId }: { salonId: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const [link, setLink] = useState("");

  useEffect(() => {
    if (state !== "copied") return;
    const timer = setTimeout(() => setState("idle"), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [state]);

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
        {state === "copied" ? "Link copied" : "Copy salon link"}
      </Button>
      <p role="status" className="sr-only">
        {state === "copied" ? "Salon link copied to the clipboard." : null}
        {state === "failed"
          ? "Could not copy automatically. Select the link below and copy it."
          : null}
      </p>
      {state === "failed" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salon-link">Copy this link</Label>
          <Input
            id="salon-link"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      ) : null}
    </div>
  );
}
