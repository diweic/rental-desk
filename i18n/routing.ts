// Supported locales — add 'zh-cn' in Phase 2.
// No middleware routing used; next-intl runs in server-only mode.
// The locale comes from the URL segment [locale] directly.
export const locales = ["en-us", "zh-cn"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en-us";
