export const TOKEN_COOKIE = "sb_token";
export const TOKEN_MAX_AGE = 30 * 60;

type TokenCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
};

export function tokenCookieOptions(): TokenCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  };
}

export function clearedCookieOptions(): TokenCookieOptions {
  return { ...tokenCookieOptions(), maxAge: 0 };
}

/**
 * Display-only: which header link to show. NOT a permission. Anyone can edit
 * this cookie, so every protected page still asks the API who the user is
 * (`requireUser`) and the API enforces roles itself. It lives as long as the
 * token and is cleared with it.
 */
export const ROLE_COOKIE = "sb_role";

export type DisplayRole = "owner" | "client";

/** Only the two known roles count; anything else (missing, edited) is unknown. */
export function parseRole(
  value: string | undefined | null,
): DisplayRole | null {
  return value === "owner" || value === "client" ? value : null;
}
