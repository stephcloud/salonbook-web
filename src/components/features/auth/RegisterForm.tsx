"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch, authFetch, type FieldErrors } from "@/lib/api";
import { homeForRole } from "@/lib/auth/home";
import {
  PASSWORD_MIN,
  validateRegister,
  type RegisterValues,
} from "@/lib/auth/validate";
import { useSlowPending } from "@/hooks/useSlowPending";
import type { components } from "@/lib/api-types";
import { FormField } from "./FormField";
import { RoleChoice } from "./RoleChoice";

type RegisterFormProps = { next: string | null };

export function RegisterForm({ next }: RegisterFormProps) {
  const router = useRouter();
  const [role, setRole] = useState<RegisterValues["role"]>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [pending, setPending] = useState(false);
  const waking = useSlowPending(pending);
  const formRef = useRef<HTMLFormElement>(null);

  // Move focus to the first invalid field so keyboard and screen-reader users land on the problem.
  useEffect(() => {
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [errors]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const values: RegisterValues = { role, name, email, password };
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length > 0 || role === "") return;

    setPending(true);
    let created = accountCreated;
    try {
      if (!created) {
        await apiFetch("auth/register", {
          body: { name: name.trim(), email: email.trim(), password, role },
        });
        created = true;
        setAccountCreated(true);
      }
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
      } else if (created) {
        setFormError(
          "Your account was created, but we could not sign you in. Please try again.",
        );
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
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      {formError ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {formError}
        </p>
      ) : null}
      <RoleChoice value={role} onChange={setRole} error={errors.role} />
      <FormField
        id="name"
        label="Full name"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />
      <FormField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <FormField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={`At least ${PASSWORD_MIN} characters.`}
        error={errors.password}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p aria-live="polite" className="min-h-5 text-sm text-muted-foreground">
        {waking
          ? "Waking up the server. This can take up to a minute, please wait."
          : ""}
      </p>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="inline-flex min-h-11 items-center rounded-full px-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
