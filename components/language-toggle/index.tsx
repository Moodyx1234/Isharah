"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const nextLocale = locale === "ar" ? "en" : "ar";
    const segments = pathname.split("/");
    segments[1] = nextLocale;
    router.push(segments.join("/"));
  };

  return (
    <button
      onClick={toggle}
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      className="flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm font-medium transition-all hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Globe size={16} aria-hidden="true" />
      <span>{locale === "ar" ? "English" : "العربية"}</span>
    </button>
  );
}
