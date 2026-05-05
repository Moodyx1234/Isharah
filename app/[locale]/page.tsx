import { useTranslations } from "next-intl";
import Link from "next/link";
import { Navbar } from "@/components/nav/Navbar";
import {
  Ear, Eye, BookOpen, ChevronRight, Users,
  ArrowDown, Mic, ImageIcon, Sparkles, CheckCircle2,
  Volume2, Hand, FileText, Wifi,
} from "lucide-react";

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
  const isAr = locale === "ar";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ═══════════════════════════════════════ HERO ═══════════════════════════════════════ */}
      <section
        className="hero-mesh relative overflow-hidden min-h-[92vh] flex items-center"
        aria-labelledby="hero-title"
      >
        {/* Decorative circles */}
        <div className="absolute top-1/4 end-12 h-64 w-64 rounded-full bg-accent/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 start-8 h-80 w-80 rounded-full bg-teal-400/6 blur-3xl pointer-events-none" />

        {/* Floating icon blobs */}
        <div className="float absolute top-16 end-20 h-12 w-12 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center hidden lg:flex">
          <Ear size={20} className="text-accent-light" aria-hidden />
        </div>
        <div className="float-slow absolute top-36 end-40 h-10 w-10 rounded-xl bg-teal-400/20 border border-teal-300/20 flex items-center justify-center hidden lg:flex" style={{ animationDelay: "1s" }}>
          <Eye size={16} className="text-teal-300" aria-hidden />
        </div>
        <div className="float absolute bottom-32 start-24 h-11 w-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center hidden lg:flex" style={{ animationDelay: "2s" }}>
          <Mic size={17} className="text-white/70" aria-hidden />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-24 w-full">
          <div className="flex flex-col items-center text-center gap-7 max-w-4xl mx-auto">

            {/* Badge */}
            <div className="animate-slide-up tag-badge">
              <Sparkles size={12} aria-hidden />
              {t("landing.hero.badge")}
            </div>

            {/* Title */}
            <h1
              id="hero-title"
              className="animate-slide-up-1 text-6xl md:text-8xl font-black tracking-tighter leading-none"
            >
              <span className="text-gradient">{t("landing.hero.title")}</span>
            </h1>

            {/* Subtitle */}
            <p className="animate-slide-up-2 text-xl md:text-2xl font-medium text-white/80 max-w-xl leading-relaxed">
              {t("landing.hero.subtitle")}
            </p>

            {/* Description */}
            <p className="animate-slide-up-3 text-base text-white/55 max-w-2xl leading-relaxed">
              {t("landing.hero.description")}
            </p>

            {/* CTAs */}
            <div className="animate-slide-up-4 flex flex-wrap gap-3 justify-center mt-2">
              <Link
                href={`/${locale}/lecturer`}
                className="group inline-flex items-center gap-2.5 rounded-2xl bg-accent px-8 py-4 text-base font-bold text-white shadow-lg shadow-accent/30 hover:bg-accent-dark hover:shadow-accent/40 hover:shadow-xl transition-all duration-200 active:scale-[0.97]"
              >
                {t("landing.hero.cta_primary")}
                <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/8 px-8 py-4 text-base font-bold text-white hover:bg-white/15 hover:border-white/30 transition-all duration-200 backdrop-blur-sm"
              >
                {t("landing.hero.cta_secondary")}
                <ArrowDown size={16} aria-hidden />
              </a>
            </div>

            {/* Stats */}
            <div className="animate-slide-up-4 mt-6 w-full max-w-2xl">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-6 py-5 grid grid-cols-3 gap-4 divide-x divide-white/10 rtl:divide-x-reverse">
                <StatItem
                  value={t("landing.hero.stats.deaf_blind")}
                  label={t("landing.hero.stats.deaf_blind_label")}
                  color="text-teal-300"
                />
                <StatItem
                  value={t("landing.hero.stats.universities")}
                  label={t("landing.hero.stats.universities_label")}
                  color="text-accent-light"
                />
                <StatItem
                  value={t("landing.hero.stats.accessibility")}
                  label={t("landing.hero.stats.accessibility_label")}
                  color="text-red-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <a
          href="#features"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors"
          aria-label="Scroll down"
        >
          <span className="text-xs tracking-widest uppercase font-medium">
            {isAr ? "اكتشف" : "Explore"}
          </span>
          <div className="h-8 w-[1px] bg-gradient-to-b from-transparent via-white/40 to-transparent" />
        </a>
      </section>

      {/* ═══════════════════════════════════════ PROBLEM BANNER ═══════════════════════════════════════ */}
      <section className="py-16 px-6 bg-[var(--card)] border-y border-[var(--card-border)]">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="shrink-0 text-center md:text-start">
              <p className="text-6xl md:text-7xl font-black text-primary leading-none">2.7M+</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-[140px] leading-snug">
                {t("landing.hero.stats.deaf_blind_label")}
              </p>
            </div>
            <div className="w-px h-16 bg-[var(--card-border)] hidden md:block" />
            <div>
              <h2 className="text-xl font-bold mb-2">{t("landing.problem.title")}</h2>
              <p className="text-[var(--color-text-muted)] leading-relaxed max-w-2xl">
                {t("landing.problem.description")}
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--fg)]">
                    <span className="mt-0.5 h-4 w-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    </span>
                    {t(`landing.problem.points.${i}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ FEATURES ═══════════════════════════════════════ */}
      <section id="features" className="py-24 px-6" aria-labelledby="features-title">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="text-accent font-semibold text-sm uppercase tracking-wider mb-3">
              {isAr ? "الحل" : "The Solution"}
            </p>
            <h2 id="features-title" className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              {t("landing.features.title")}
            </h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto leading-relaxed">
              {isAr
                ? "ثلاث واجهات مخصصة. تجربة واحدة متكاملة."
                : "Three dedicated interfaces. One seamless experience."}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              href={`/${locale}/student/deaf`}
              index="01"
              icon={<Ear size={26} aria-hidden />}
              iconBg="bg-primary/10 text-primary"
              title={t("landing.features.deaf.title")}
              description={t("landing.features.deaf.description")}
              features={[
                t("landing.features.deaf.features.0"),
                t("landing.features.deaf.features.1"),
                t("landing.features.deaf.features.2"),
              ]}
              accentClass="feature-card-primary"
              ctaColor="text-primary"
              preview={<DeafPreview isAr={isAr} />}
            />
            <FeatureCard
              href={`/${locale}/student/blind`}
              index="02"
              icon={<Eye size={26} aria-hidden />}
              iconBg="bg-accent/10 text-accent-dark"
              title={t("landing.features.blind.title")}
              description={t("landing.features.blind.description")}
              features={[
                t("landing.features.blind.features.0"),
                t("landing.features.blind.features.1"),
                t("landing.features.blind.features.2"),
              ]}
              accentClass="feature-card-accent"
              ctaColor="text-accent-dark"
              preview={<BlindPreview isAr={isAr} />}
            />
            <FeatureCard
              href={`/${locale}/student/sighted`}
              index="03"
              icon={<BookOpen size={26} aria-hidden />}
              iconBg="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              title={t("landing.features.sighted.title")}
              description={t("landing.features.sighted.description")}
              features={[
                t("landing.features.sighted.features.0"),
                t("landing.features.sighted.features.1"),
                t("landing.features.sighted.features.2"),
              ]}
              accentClass="feature-card-success"
              ctaColor="text-green-700 dark:text-green-400"
              preview={<SightedPreview isAr={isAr} />}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ HOW IT WORKS ═══════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="py-24 px-6 bg-primary/[0.03] dark:bg-white/[0.02] border-y border-[var(--card-border)]"
        aria-labelledby="how-title"
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
              {isAr ? "كيف يعمل" : "How it works"}
            </p>
            <h2 id="how-title" className="text-3xl md:text-5xl font-black tracking-tight">
              {t("landing.how_it_works.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {[0, 1, 2, 3].map((i) => (
              <StepCard
                key={i}
                number={t(`landing.how_it_works.steps.${i}.number`)}
                title={t(`landing.how_it_works.steps.${i}.title`)}
                description={t(`landing.how_it_works.steps.${i}.description`)}
                isLast={i === 3}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ CTA ═══════════════════════════════════════ */}
      <section className="py-24 px-6 gradient-cta relative overflow-hidden" aria-labelledby="cta-title">
        {/* bg decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 end-0 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute bottom-0 start-0 w-80 h-80 rounded-full bg-teal-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <span className="tag-badge mb-6 inline-flex">
            <Sparkles size={12} aria-hidden />
            {isAr ? "ابدأ الآن" : "Get Started"}
          </span>
          <h2 id="cta-title" className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
            {t("landing.cta.title")}
          </h2>
          <p className="text-white/55 mb-12 max-w-lg mx-auto leading-relaxed">
            {t("landing.cta.description")}
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            <CtaCard
              href={`/${locale}/lecturer`}
              icon={<Users size={20} aria-hidden />}
              label={t("landing.cta.lecturer_btn")}
              primary
            />
            <CtaCard
              href={`/${locale}/student/deaf`}
              icon={<Ear size={20} aria-hidden />}
              label={t("landing.cta.deaf_btn")}
            />
            <CtaCard
              href={`/${locale}/student/blind`}
              icon={<Eye size={20} aria-hidden />}
              label={t("landing.cta.blind_btn")}
            />
            <CtaCard
              href={`/${locale}/student/sighted`}
              icon={<BookOpen size={20} aria-hidden />}
              label={t("landing.cta.sighted_btn")}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ FOOTER ═══════════════════════════════════════ */}
      <footer className="border-t border-[var(--card-border)] py-10 px-6 bg-[var(--card)]">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
                <span className="text-white font-black text-base">إ</span>
              </div>
              <div>
                <p className="font-black text-base leading-tight">
                  <span className="text-primary">إشارة</span>
                  <span className="text-[var(--color-text-muted)] font-normal text-sm"> · Isharah</span>
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">{t("landing.footer.tagline")}</p>
              </div>
            </div>

            {/* Quick links */}
            <div className="flex items-center gap-5 text-sm text-[var(--color-text-muted)]">
              <Link href={`/${locale}/lecturer`} className="hover:text-primary transition-colors">
                {t("nav.lecturer")}
              </Link>
              <Link href={`/${locale}/student/deaf`} className="hover:text-primary transition-colors">
                {isAr ? "الطالب الأصم" : "Deaf Student"}
              </Link>
              <Link href={`/${locale}/student/blind`} className="hover:text-primary transition-colors">
                {isAr ? "الطالب الكفيف" : "Blind Student"}
              </Link>
            </div>

            {/* Credits */}
            <div className="text-center md:text-end text-xs text-[var(--color-text-muted)] leading-relaxed">
              <p>{t("landing.footer.built_for")}</p>
              <p className="mt-0.5 text-primary/70">{t("landing.footer.powered_by")}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatItem({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <span className={`text-2xl md:text-3xl font-black ${color}`}>{value}</span>
      <span className="text-[10px] text-white/45 text-center leading-snug">{label}</span>
    </div>
  );
}

function FeatureCard({
  href, index, icon, iconBg, title, description, features, accentClass, ctaColor, preview,
}: {
  href: string; index: string; icon: React.ReactNode; iconBg: string;
  title: string; description: string; features: string[];
  accentClass: string; ctaColor: string; preview: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`relative group card p-0 flex flex-col overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-250 ${accentClass}`}
    >
      {/* Preview area */}
      <div className="w-full h-40 overflow-hidden bg-[var(--bg)] border-b border-[var(--card-border)]">
        {preview}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-4 flex-1">
        <div className="flex items-start gap-3">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <div className="flex-1">
            <span className="text-xs font-bold text-[var(--color-text-muted)] tracking-wider">{index}</span>
            <h3 className="text-lg font-bold leading-tight">{title}</h3>
          </div>
        </div>

        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{description}</p>

        <ul className="flex flex-col gap-2 mt-auto" role="list">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle2 size={14} className={`shrink-0 ${ctaColor}`} aria-hidden />
              {f}
            </li>
          ))}
        </ul>

        <div className={`flex items-center gap-1 text-sm font-semibold mt-2 ${ctaColor}`}>
          <span className="group-hover:underline">
            {index === "01" ? "واجهة الإشارة" : index === "02" ? "واجهة الصوت" : "الواجهة العامة"}
          </span>
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" aria-hidden />
        </div>
      </div>
    </a>
  );
}

function StepCard({
  number, title, description, isLast,
}: {
  number: string; title: string; description: string; isLast: boolean;
}) {
  return (
    <div className={`relative flex flex-col items-center text-center gap-4 ${!isLast ? "step-line" : ""}`}>
      <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 ring-4 ring-primary/10 relative z-10">
        <span className="text-white text-lg font-black">{number}</span>
      </div>
      <div>
        <h3 className="text-base font-bold mb-2">{title}</h3>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function CtaCard({
  href, icon, label, primary = false,
}: {
  href: string; icon: React.ReactNode; label: string; primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-2 rounded-2xl px-4 py-5 text-sm font-bold transition-all duration-200 active:scale-[0.97] ${
        primary
          ? "bg-accent text-white shadow-lg shadow-accent/30 hover:bg-accent-dark hover:shadow-accent/40 hover:shadow-xl"
          : "border border-white/15 bg-white/6 text-white/80 hover:bg-white/12 hover:text-white hover:border-white/25 backdrop-blur-sm"
      }`}
    >
      <span className={primary ? "text-white" : "text-white/70"}>{icon}</span>
      <span className="leading-tight text-center text-xs">{label}</span>
    </Link>
  );
}

/* ─── Mini preview widgets inside feature cards ─── */
function DeafPreview({ isAr }: { isAr: boolean }) {
  return (
    <div className="w-full h-full flex items-center justify-center gap-4 p-4">
      {/* Avatar silhouette */}
      <div className="relative">
        <div className="h-20 w-14 rounded-2xl bg-primary/8 border border-primary/15 flex flex-col items-center justify-end pb-1 overflow-hidden">
          {/* head */}
          <div className="absolute top-2.5 h-6 w-6 rounded-full bg-primary/20 border border-primary/30" />
          {/* body */}
          <div className="absolute top-9 h-8 w-8 rounded-t-xl bg-primary/15 border border-primary/20" />
          {/* arms waving */}
          <div className="absolute top-11 -start-3 h-1.5 w-5 rounded-full bg-accent/70 origin-end" style={{ transform: "rotate(-30deg)" }} />
          <div className="absolute top-11 -end-3 h-1.5 w-5 rounded-full bg-primary/40 origin-start" style={{ transform: "rotate(20deg)" }} />
          {/* LIVE dot */}
          <span className="absolute top-1.5 end-1.5 h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        </div>
      </div>
      {/* Caption bar */}
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="rounded-lg bg-primary/8 border border-primary/12 px-2.5 py-1.5">
          <p className="text-[10px] font-medium text-primary/70 truncate">
            {isAr ? "السلام عليكم..." : "Hello, today..."}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--card-border)]/50 px-2.5 py-1">
          <p className="text-[9px] text-[var(--color-text-muted)] truncate">
            {isAr ? "نتحدث عن الخوارزميات" : "algorithms today"}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--card-border)]/30 px-2.5 py-1">
          <p className="text-[9px] text-[var(--color-text-muted)]/60 truncate">
            {isAr ? "الفرز الفقاعي..." : "bubble sort..."}
          </p>
        </div>
      </div>
    </div>
  );
}

function BlindPreview({ isAr }: { isAr: boolean }) {
  return (
    <div className="w-full h-full bg-[#0a0a14] flex items-center justify-center gap-5 p-4 rounded-t-2xl">
      {/* Big mic circle */}
      <div className="relative h-16 w-16 rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center shrink-0">
        <Mic size={22} className="text-accent" aria-hidden />
        <span className="absolute inset-0 rounded-full border-2 border-accent/20 animate-ping" />
      </div>
      {/* waveform + text */}
      <div className="flex flex-col gap-2.5 flex-1">
        <div className="flex items-end gap-0.5 h-8">
          {[10, 16, 24, 14, 20, 12, 18, 10, 22, 15].map((h, i) => (
            <div
              key={i}
              className="waveform-bar w-1 rounded-full bg-accent/60"
              style={{ height: `${h}px`, animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </div>
        <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1">
          <p className="text-[9px] text-white/60">
            {isAr ? "جارٍ السرد الصوتي..." : "Narrating..."}
          </p>
        </div>
        <div className="flex gap-1">
          {["R", "D", "S"].map((k) => (
            <kbd key={k} className="rounded bg-white/8 border border-white/15 px-1.5 py-0.5 text-[9px] font-mono text-white/50">
              {k}
            </kbd>
          ))}
        </div>
      </div>
    </div>
  );
}

function SightedPreview({ isAr }: { isAr: boolean }) {
  return (
    <div className="w-full h-full flex flex-col gap-2 p-4">
      {/* Caption bar */}
      <div className="rounded-xl bg-primary text-white px-3 py-1.5 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse shrink-0" />
        <p className="text-[10px] font-medium truncate">
          {isAr ? "خوارزمية الفرز السريع..." : "Quick sort algorithm..."}
        </p>
      </div>
      {/* Summary lines */}
      <div className="flex flex-col gap-1 flex-1">
        {[90, 70, 80, 55].map((w, i) => (
          <div
            key={i}
            className="h-2 rounded-full bg-[var(--card-border)]"
            style={{ width: `${w}%`, opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
      {/* Q badge */}
      <div className="flex items-center gap-1.5">
        <div className="h-5 w-5 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <span className="text-[9px] font-bold text-amber-600">Q</span>
        </div>
        <p className="text-[9px] text-[var(--color-text-muted)]">
          {isAr ? "5 أسئلة مراجعة" : "5 review questions"}
        </p>
      </div>
    </div>
  );
}
