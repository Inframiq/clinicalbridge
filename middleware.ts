import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vnteirfqxhbngkqxnbpu.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const protectedPrefixes = ["/hospital", "/working-doctor", "/locum", "/intern", "/super-admin"];
  const isProtectedRoute = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtectedRoute && !user) {
    // Check if client auth session cookie is present for local demo fallback
    const authSessionCookie = request.cookies.get("lt-auth-session");
    if (!authSessionCookie) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/hospital/:path*",
    "/working-doctor/:path*",
    "/locum/:path*",
    "/intern/:path*",
    "/super-admin/:path*",
  ],
};
