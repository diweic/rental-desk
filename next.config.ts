import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Required for Cloudflare Pages / Workers deployment
  // Remove this if deploying to Vercel or other Node.js platforms
  // output: "export", // uncomment only for static export — not needed with Cloudflare Pages
};

export default withNextIntl(nextConfig);
