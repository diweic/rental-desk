"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, Package } from "lucide-react";

// Fixed bottom navigation bar — visible on mobile.
// Three tabs: Calendar (main), Orders, Inventory.
export default function BottomNav() {
  const t = useTranslations("nav");
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale as string;
  const clientId = params.clientId as string;

  const base = `/${locale}/${clientId}`;

  const tabs = [
    {
      href: base,
      label: t("calendar"),
      icon: CalendarDays,
      // Active when on the exact base path (calendar is the index page)
      active: pathname === base,
    },
    {
      href: `${base}/orders`,
      label: t("orders"),
      icon: ClipboardList,
      active: pathname.startsWith(`${base}/orders`),
    },
    {
      href: `${base}/inventory`,
      label: t("inventory"),
      icon: Package,
      active: pathname.startsWith(`${base}/inventory`),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
      {tabs.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[11px] font-medium transition-colors ${
            active ? "text-blue-600" : "text-gray-400"
          }`}
        >
          <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
