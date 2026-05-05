import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/language-toggle";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export function Navbar() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const location = useLocation();
  const pathname = location.pathname;
  const [dark, setDark] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const preferLight = stored === "light";
    if (preferLight) {
      setDark(false);
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("light", !next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  const isHeroPage = pathname === `/${locale}`;
  const navLinks = [
    { href: `/${locale}/lecturer`, label: t("nav.lecturer") },
    { href: `/${locale}/student/deaf`, label: locale === "ar" ? "الطالب الأصم" : "Deaf Student" },
    { href: `/${locale}/student/blind`, label: locale === "ar" ? "الطالب الكفيف" : "Blind Student" },
  ];

  return (
    <>
      <nav
        aria-label={t("nav.home")}
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "glass border-b border-[var(--card-border)] shadow-sm"
            : isHeroPage
            ? "bg-transparent border-b border-white/10"
            : "glass border-b border-[var(--card-border)]"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
          <Link
            to={`/${locale}`}
            className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={t("app.name")}
          >
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-md ring-2 ring-white/10">
              <span className="text-lg font-black leading-none text-white">إ</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className={`text-base font-black tracking-tight ${isHeroPage && !scrolled ? "text-white" : "text-primary"}`}>
                إشارة
              </span>
              <span className={`text-[10px] font-medium tracking-wider uppercase ${isHeroPage && !scrolled ? "text-white/60" : "text-[var(--color-text-muted)]"}`}>
                Isharah
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-primary/10 text-primary"
                      : isHeroPage && !scrolled
                      ? "text-white/80 hover:text-white hover:bg-white/10"
                      : "text-[var(--fg)] hover:text-primary hover:bg-primary/6"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              aria-label={dark ? t("common.light_mode") : t("common.dark_mode")}
              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                isHeroPage && !scrolled
                  ? "text-white/70 hover:text-white hover:bg-white/10"
                  : "border border-[var(--card-border)] bg-[var(--card)] hover:border-primary hover:text-primary"
              }`}
            >
              {dark ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
            </button>

            <LanguageToggle subtle={isHeroPage && !scrolled} />

            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
              className={`md:hidden h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                isHeroPage && !scrolled
                  ? "text-white/70 hover:text-white hover:bg-white/10"
                  : "border border-[var(--card-border)] bg-[var(--card)]"
              }`}
            >
              {menuOpen ? <X size={16} aria-hidden /> : <Menu size={16} aria-hidden />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden glass border-t border-[var(--card-border)] px-5 pb-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMenuOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--fg)] hover:text-primary hover:bg-primary/6 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}
