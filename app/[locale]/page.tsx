import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { Navbar } from "@/components/nav/Navbar";
import { Hand, Ear, Eye, ChevronRight, Users, BookOpen, Zap } from "lucide-react";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <LandingContent locale={locale} />;
}

function LandingContent({ locale }: { locale: string }) {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        aria-labelledby="hero-title"
      >
        <div className="absolute inset-0 gradient-primary opacity-[0.03] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="flex flex-col items-center text-center gap-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              {t("landing.hero.badge")}
            </div>

            <h1
              id="hero-title"
              className="text-5xl md:text-7xl font-black tracking-tight"
            >
              <span className="text-gradient">{t("landing.hero.title")}</span>
            </h1>

            <p className="text-2xl md:text-3xl font-medium text-[var(--fg)] max-w-2xl leading-snug">
              {t("landing.hero.subtitle")}
            </p>

            <p className="text-lg text-[var(--color-text-muted)] max-w-2xl leading-relaxed">
              {t("landing.hero.description")}
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href={`/${locale}/lecturer`}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-primary-light hover:shadow-xl transition-all active:scale-[0.98]"
              >
                {t("landing.hero.cta_primary")}
                <ChevronRight size={20} aria-hidden />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-primary px-8 py-4 text-lg font-semibold text-primary hover:bg-primary hover:text-white transition-all"
              >
                {t("landing.hero.cta_secondary")}
              </a>
            </div>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-3 gap-8 md:gap-16 border-t border-[var(--card-border)] pt-8 w-full max-w-2xl">
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl font-black text-primary">
                  {t("landing.hero.stats.deaf_blind")}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] text-center leading-snug">
                  {t("landing.hero.stats.deaf_blind_label")}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl font-black text-accent">
                  {t("landing.hero.stats.universities")}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] text-center leading-snug">
                  {t("landing.hero.stats.universities_label")}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl font-black text-[var(--color-error)]">
                  {t("landing.hero.stats.accessibility")}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] text-center leading-snug">
                  {t("landing.hero.stats.accessibility_label")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        className="py-20 px-6"
        aria-labelledby="features-title"
      >
        <div className="mx-auto max-w-7xl">
          <h2
            id="features-title"
            className="text-3xl md:text-4xl font-bold text-center mb-4"
          >
            {t("landing.features.title")}
          </h2>
          <p className="text-center text-[var(--color-text-muted)] mb-14 max-w-xl mx-auto">
            {t("landing.problem.description")}
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Deaf Student */}
            <FeatureCard
              href={`/${locale}/student/deaf`}
              icon={<Ear className="text-primary" size={28} aria-hidden />}
              title={t("landing.features.deaf.title")}
              description={t("landing.features.deaf.description")}
              features={[
                t("landing.features.deaf.features.0"),
                t("landing.features.deaf.features.1"),
                t("landing.features.deaf.features.2"),
              ]}
              accentColor="primary"
            />

            {/* Blind Student */}
            <FeatureCard
              href={`/${locale}/student/blind`}
              icon={<Eye className="text-accent-dark" size={28} aria-hidden />}
              title={t("landing.features.blind.title")}
              description={t("landing.features.blind.description")}
              features={[
                t("landing.features.blind.features.0"),
                t("landing.features.blind.features.1"),
                t("landing.features.blind.features.2"),
              ]}
              accentColor="accent"
            />

            {/* Sighted Student */}
            <FeatureCard
              href={`/${locale}/student/sighted`}
              icon={<BookOpen className="text-[var(--color-success)]" size={28} aria-hidden />}
              title={t("landing.features.sighted.title")}
              description={t("landing.features.sighted.description")}
              features={[
                t("landing.features.sighted.features.0"),
                t("landing.features.sighted.features.1"),
                t("landing.features.sighted.features.2"),
              ]}
              accentColor="success"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="py-20 px-6 bg-primary/5"
        aria-labelledby="how-title"
      >
        <div className="mx-auto max-w-7xl">
          <h2
            id="how-title"
            className="text-3xl md:text-4xl font-bold text-center mb-16"
          >
            {t("landing.how_it_works.title")}
          </h2>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-black">
                    {t(`landing.how_it_works.steps.${i}.number`)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold">
                  {t(`landing.how_it_works.steps.${i}.title`)}
                </h3>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {t(`landing.how_it_works.steps.${i}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6" aria-labelledby="cta-title">
        <div className="mx-auto max-w-4xl text-center">
          <h2 id="cta-title" className="text-3xl md:text-4xl font-bold mb-4">
            {t("landing.cta.title")}
          </h2>
          <p className="text-[var(--color-text-muted)] mb-10 max-w-xl mx-auto">
            {t("landing.cta.description")}
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <DemoButton
              href={`/${locale}/lecturer`}
              label={t("landing.cta.lecturer_btn")}
              icon={<Users size={18} aria-hidden />}
              variant="primary"
            />
            <DemoButton
              href={`/${locale}/student/deaf`}
              label={t("landing.cta.deaf_btn")}
              icon={<Ear size={18} aria-hidden />}
              variant="outline"
            />
            <DemoButton
              href={`/${locale}/student/blind`}
              label={t("landing.cta.blind_btn")}
              icon={<Eye size={18} aria-hidden />}
              variant="outline"
            />
            <DemoButton
              href={`/${locale}/student/sighted`}
              label={t("landing.cta.sighted_btn")}
              icon={<BookOpen size={18} aria-hidden />}
              variant="outline"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--card-border)] py-8 px-6 mt-auto">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--color-text-muted)]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-white text-sm font-bold">إ</span>
            </div>
            <span>
              <strong className="text-[var(--fg)]">{t("app.name")}</strong> —{" "}
              {t("landing.footer.tagline")}
            </span>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1">
            <span>{t("landing.footer.built_for")}</span>
            <span className="text-xs">{t("landing.footer.powered_by")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  href,
  icon,
  title,
  description,
  features,
  accentColor,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  accentColor: "primary" | "accent" | "success";
}) {
  const borderColor = {
    primary: "hover:border-primary",
    accent: "hover:border-accent",
    success: "hover:border-[var(--color-success)]",
  }[accentColor];

  return (
    <a
      href={href}
      className={`card group p-6 flex flex-col gap-4 transition-all duration-200 hover:shadow-md ${borderColor} border-2 border-transparent`}
    >
      <div className="h-12 w-12 rounded-xl bg-[var(--bg)] flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          {description}
        </p>
      </div>
      <ul className="flex flex-col gap-2 mt-auto" role="list">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-1 text-sm font-medium text-primary mt-2">
        <ChevronRight size={16} aria-hidden className="group-hover:translate-x-1 transition-transform" />
      </div>
    </a>
  );
}

function DemoButton({
  href,
  label,
  icon,
  variant,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  variant: "primary" | "outline";
}) {
  const cls =
    variant === "primary"
      ? "gradient-primary text-white shadow-lg hover:shadow-xl"
      : "border-2 border-primary text-primary hover:bg-primary hover:text-white bg-transparent";

  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${cls}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
