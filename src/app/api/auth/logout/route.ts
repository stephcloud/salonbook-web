import { NextResponse } from "next/server";
import {
  ROLE_COOKIE,
  TOKEN_COOKIE,
  clearedCookieOptions,
} from "@/lib/auth/cookie";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(TOKEN_COOKIE, "", clearedCookieOptions());
  response.cookies.set(ROLE_COOKIE, "", clearedCookieOptions());
  return response;
}
