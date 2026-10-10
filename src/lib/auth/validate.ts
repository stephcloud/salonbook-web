import type { FieldErrors } from "@/lib/api";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const NAME_MAX = 100;

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginValues = { email: string; password: string };
export type RegisterValues = LoginValues & {
  name: string;
  role: "client" | "owner" | "";
};

function emailError(email: string): string | undefined {
  if (!email.trim()) return "Enter your email.";
  if (!EMAIL_SHAPE.test(email.trim())) return "Enter a valid email address.";
  return undefined;
}

function compact(errors: Record<string, string | undefined>): FieldErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}

export function validateLogin(values: LoginValues): FieldErrors {
  return compact({
    email: emailError(values.email),
    password: values.password ? undefined : "Enter your password.",
  });
}

export function validateRegister(values: RegisterValues): FieldErrors {
  const name = values.name.trim();
  let password: string | undefined;
  if (!values.password) password = "Choose a password.";
  else if (values.password.length < PASSWORD_MIN)
    password = `Use at least ${PASSWORD_MIN} characters.`;
  else if (values.password.length > PASSWORD_MAX)
    password = `Use at most ${PASSWORD_MAX} characters.`;

  return compact({
    role: values.role ? undefined : "Choose how you will use SalonBook.",
    name: !name
      ? "Enter your name."
      : name.length > NAME_MAX
        ? `Use at most ${NAME_MAX} characters.`
        : undefined,
    email: emailError(values.email),
    password,
  });
}
