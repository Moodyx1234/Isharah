import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export function LanguageToggle({ subtle = false }: { subtle?: boolean }) {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const navigate = useNavigate();
  const location = useLocation();

  const toggle = () => {
    const nextLocale = locale === "ar" ? "en" : "ar";
    const segments = location.pathname.split("/");
    segments[1] = nextLocale;
    navigate(segments.join("/"));
  };

  return (
    <button
      onClick={toggle}
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        subtle
          ? "text-white/70 hover:text-white hover:bg-white/10"
          : "border border-[var(--card-border)] bg-[var(--card)] hover:border-primary hover:text-primary"
      }`}
    >
      <Globe size={14} aria-hidden="true" />
      <span>{locale === "ar" ? "EN" : "ع"}</span>
    </button>
  );
}
