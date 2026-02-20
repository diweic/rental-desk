import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// next-intl middleware handles locale detection and redirect.
// e.g. visiting /en-us/abc123 sets the locale to "en-us".
export default createMiddleware(routing);

export const config = {
  // Match all paths except: API routes, static files, and /admin (which has its own auth)
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
