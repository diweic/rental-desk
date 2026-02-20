// Locale layout — MUST be a server component (no "use client").
// next-intl requires getMessages() to run server-side.
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Providers from "@/providers/Providers";

// Tell Next.js which locale values are valid for static generation.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Reject unsupported locales with a 404.
  if (!routing.locales.includes(locale as "en-us")) {
    notFound();
  }

  // Load translation messages server-side and pass to the client provider.
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <Providers>{children}</Providers>
    </NextIntlClientProvider>
  );
}
