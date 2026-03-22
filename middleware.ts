import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/contract",
    "/contract/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/compare",
    "/compare/:path*",
    "/auth/:path*",
  ],
};
