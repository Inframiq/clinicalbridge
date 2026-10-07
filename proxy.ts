import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

const PROTECTED = ["/hospital", "/working-doctor", "/locum-tenens", "/super-admin"];

export async function proxy(request: NextRequest) {
  // Fail closed: every matched path is a protected role section, and without
  // Supabase there is no way to authenticate the request.
  if (!isSupabaseConfigured) {
    return new NextResponse("Service unavailable: authentication is not configured.", { status: 503 });
  }

  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  if (!user && PROTECTED.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/hospital/:path*", "/working-doctor/:path*", "/locum-tenens/:path*", "/super-admin/:path*"],
};
