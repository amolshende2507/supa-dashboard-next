import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // create supabase client for middleware
  const supabase = createMiddlewareClient({ req, res });

  // check session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const protectedRoutes = ["/expenses"];

  if (!session && protectedRoutes.includes(req.nextUrl.pathname)) {
    const redirectUrl = new URL("/auth", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}
export const config = {
  matcher: ["/expenses"], // protect only these routes for now
};
