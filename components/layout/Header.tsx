"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";

// Fixed header shown on all app pages (calendar, orders, inventory).
// Clicking the title navigates to the calendar (main page).
export default function Header() {
  const t = useTranslations("app");
  const params = useParams();
  const locale = params.locale as string;
  const clientId = params.clientId as string;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <Link
          href={`/${locale}/${clientId}`}
          className="font-bold text-blue-600 text-lg tracking-tight"
        >
          {t("name")}
        </Link>
      </div>
    </header>
  );
}
