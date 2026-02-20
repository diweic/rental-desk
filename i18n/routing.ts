import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Supported locales — add 'zh-cn' in Phase 2
  locales: ["en-us"],
  defaultLocale: "en-us",
});
