import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Matchear todos los paths excepto:
     * - _next/static
     * - _next/image
     * - favicon.ico, robots.txt, sitemap.xml
     * - archivos con extensión (png, jpg, svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
}
