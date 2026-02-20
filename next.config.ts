import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Keep the next-intl plugin so getMessages() and useTranslations() work in
// server components. The plugin does NOT require middleware — it just wires
// up the request config path. We removed middleware (proxy.ts) separately.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
