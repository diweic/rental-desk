import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale } from "./routing";

// next-intl server-only mode: no middleware, locale comes from URL param.
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Fall back to default if locale is missing or unsupported.
  if (!locale || !locales.includes(locale as typeof locales[number])) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
