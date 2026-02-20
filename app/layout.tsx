// Root layout — must NOT be a client component.
// Renders the bare <html> and <body> tags only.
// Locale-specific layout (fonts, providers, i18n) lives in [locale]/layout.tsx.
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rental Manager",
  description: "Camera rental management for concert events",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
