"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LanguageToggle } from "@/components/language-toggle";
import { Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

export function Navbar() {
  const locale = useLocale();
  const t = useTranslations();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  return (
    <nav
      aria-label={t("nav.home")}
      className="sticky top-0 z-50 glass border-b border-[var(--card-border)]"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
          aria-label={t("app.name")}
        >
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center">
            <span className="text-white text-lg font-bold leading-none">إ</span>
          </div>
          <span className="text-xl font-bold text-primary">{t("app.name")}</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/lecturer`}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-[var(--fg)] hover:text-primary hover:bg-primary/5 transition-colors"
          >
            {t("nav.lecturer")}
          </Link>
          <Link
            href={`/${locale}/student/deaf`}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-[var(--fg)] hover:text-primary hover:bg-primary/5 transition-colors"
          >
            {t("nav.student")}
          </Link>
          <button
            onClick={toggleDark}
            aria-label={dark ? t("common.light_mode") : t("common.dark_mode")}
            className="h-10 w-10 rounded-xl border border-[var(--card-border)] bg-[var(--card)] flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
          >
            {dark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          </button>
          <LanguageToggle />
        </div>
      </div>
    </nav>
  );
}
