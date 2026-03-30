import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";

/**
 * OAuth redirect target (e.g. Google). Supabase redirects here with ?code=...
 * Session cookies are written onto the redirect response.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (!code) {
    const dest = url.clone();
    dest.pathname = "/auth/sign-in";
    dest.search = "";
    dest.searchParams.set("error", "oauth");
    return NextResponse.redirect(dest);
  }

  const response = NextResponse.redirect(new URL(next, url.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const dest = url.clone();
    dest.pathname = "/auth/sign-in";
    dest.search = "";
    dest.searchParams.set("error", "oauth");
    return NextResponse.redirect(dest);
  }

  return response;
}
