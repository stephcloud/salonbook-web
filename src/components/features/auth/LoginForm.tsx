"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiError, authFetch, type FieldErrors } from "@/lib/api";
import { homeForRole } from "@/lib/auth/home";
import { validateLogin } from "@/lib/auth/validate";
import { useSlowPending } from "@/hooks/useSlowPending";
import type { components } from "@/lib/api-types";
import { FormField } from "./FormField";

type LoginFormProps = { next: string | null };

export function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const waking = useSlowPending(pending);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const found = validateLogin({ email, password });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setPending(true);
    try {
      const { user } = await authFetch<{
        user: components["schemas"]["UserResponse"];
      }>("login", { email: email.trim(), password });
      router.replace(next ?? homeForRole(user.role));
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) {
          setFormError(error.message);
        }
      } else {
        setFormError(
          error instanceof ApiError
            ? error.message
            : "Could not reach the server. Check your connection and try again.",
        );
      }
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {formError}
        </p>
      ) : null}
      <FormField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <FormField
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p aria-live="polite" className="min-h-5 text-sm text-muted-foreground">
        {waking
          ? "Waking up the server. This can take up to a minute, please wait."
          : ""}
      </p>
      <p className="text-sm text-muted-foreground">
        New to SalonBook?{" "}
        <Link
          href={
            next ? `/register?next=${encodeURIComponent(next)}` : "/register"
          }
          className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
