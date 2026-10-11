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
