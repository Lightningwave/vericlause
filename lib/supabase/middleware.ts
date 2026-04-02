import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/pricing")) return true;
  if (pathname.startsWith("/auth/sign-in")) return true;
  if (pathname.startsWith("/auth/sign-up")) return true;
  if (pathname.startsWith("/auth/callback")) return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage =
    path.startsWith("/auth/sign-in") || path.startsWith("/auth/sign-up");

  /** API routes return JSON 401 from handlers — never redirect to HTML sign-in. */
  if (path.startsWith("/api")) {
    return supabaseResponse;
  }

  if (!user && !isPublicPath(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    url.search = "";
    const returnTo = `${path}${request.nextUrl.search}`;
    url.searchParams.set("next", returnTo);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const dest = safeNextPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(dest, request.nextUrl.origin));
  }

  return supabaseResponse;
}
