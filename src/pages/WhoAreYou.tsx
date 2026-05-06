import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, Ear, Eye, BookOpen, ArrowLeft } from "lucide-react";
import styles from "./WhoAreYou.module.css";

// ── Framer-motion variants ───────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// ── Role config type ─────────────────────────────────────────────────────────
interface RoleConfig {
  path: string;
  icon: ReactNode;
  accent: string;
  accentBg: string;
  accentBorder: string;
  glowColor: string;
  sheenGradient: string;
  title: string;
  desc: string;
}

// ── Nav link type ────────────────────────────────────────────────────────────
interface NavItem {
  href: string;
  label: string;
  isRouter: boolean;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function WhoAreYou() {
  const { locale = "ar" } = useParams<{ locale: string }>();
  const [navStuck, setNavStuck]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const onScroll = () => setNavStuck(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Role cards ─────────────────────────────────────────────────────────────
  const roles: RoleConfig[] = [
    {
      path:          `/${locale}/student/deaf`,
      icon:          <Ear size={26} aria-hidden />,
      accent:        "#00C9A0",
      accentBg:      "rgba(0,201,160,0.13)",
      accentBorder:  "rgba(0,201,160,0.32)",
      glowColor:     "rgba(0,201,160,0.22)",
      sheenGradient: "radial-gradient(ellipse at 50% 0%, rgba(0,201,160,0.18) 0%, transparent 65%)",
      title:         "طالب أصم",
      desc:          "تابع المحاضرة عبر الترجمة الفورية ولغة الإشارة ثلاثية الأبعاد",
    },
    {
      path:          `/${locale}/lecturer`,
      icon:          <Mic size={26} aria-hidden />,
      accent:        "#00C9A0",
      accentBg:      "rgba(0,201,160,0.13)",
      accentBorder:  "rgba(0,201,160,0.32)",
      glowColor:     "rgba(0,201,160,0.22)",
      sheenGradient: "radial-gradient(ellipse at 50% 0%, rgba(0,201,160,0.18) 0%, transparent 65%)",
      title:         "محاضر",
      desc:          "ابدأ جلسة وتحكم في المحاضرة بأدوات الوصول الكاملة",
    },
    {
      path:          `/${locale}/student/sighted`,
      icon:          <BookOpen size={26} aria-hidden />,
      accent:        "#4ADE80",
      accentBg:      "rgba(74,222,128,0.12)",
      accentBorder:  "rgba(74,222,128,0.32)",
      glowColor:     "rgba(74,222,128,0.18)",
      sheenGradient: "radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.16) 0%, transparent 65%)",
      title:         "طالب مبصر",
      desc:          "تابع الشرائح والترجمة الحية والملخصات الذكية في مكان واحد",
    },
    {
      path:          `/${locale}/student/blind`,
      icon:          <Eye size={26} aria-hidden />,
      accent:        "#F5A623",
      accentBg:      "rgba(245,166,35,0.12)",
      accentBorder:  "rgba(245,166,35,0.32)",
      glowColor:     "rgba(245,166,35,0.18)",
      sheenGradient: "radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.16) 0%, transparent 65%)",
      title:         "طالب كفيف",
      desc:          "استمع إلى وصف الشرائح وملخصات الذكاء الاصطناعي بصوت واضح",
    },
  ];

  // ── Nav links (mirrors LandingPage navbar exactly) ─────────────────────────
  const navItems: NavItem[] = [
    { href: `/${locale}`,          label: "الرئيسية", isRouter: true  },
    { href: "/problem.html",       label: "المشكلة",  isRouter: false },
    { href: "/solution.html",      label: "الحل",     isRouter: false },
    { href: "/how-it-works.html",  label: "كيف يعمل", isRouter: false },
    { href: "/team.html",          label: "الفريق",   isRouter: false },
  ];

  // ── Inline event handlers for per-card accent hover ────────────────────────
  const handleCardEnter = (role: RoleConfig) =>
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const el = e.currentTarget;
      el.style.borderColor = role.accentBorder;
      el.style.boxShadow   = `0 0 30px ${role.glowColor}, 0 24px 64px rgba(0,0,0,0.35)`;
    };

  const handleCardLeave =
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const el = e.currentTarget;
      el.style.borderColor = "";
      el.style.boxShadow   = "";
    };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page} dir="rtl">

      {/* ── Animated blobs ── */}
      <div className={styles.blobBg} aria-hidden>
        <div className={`${styles.blob} ${styles.blob1}`} />
        <div className={`${styles.blob} ${styles.blob2}`} />
        <div className={`${styles.blob} ${styles.blob3}`} />
      </div>
      <div className={styles.gridTex} aria-hidden />

      {/* ══════════════════════════════════════════════════════════════════
          NAVBAR — identical to LandingPage (logo right, CTA left in RTL)
      ══════════════════════════════════════════════════════════════════ */}
      <nav className={`${styles.nav}${navStuck ? ` ${styles.navStuck}` : ""}`}>
        <div className={styles.navInner}>

          {/* Logo — appears on the RIGHT in RTL flex-row */}
          <Link to={`/${locale}`} className={styles.logo}>
            <div className={styles.logoIcon}>
              <span className={styles.logoGlyph}>إ</span>
            </div>
            <div>
              <div className={styles.logoName}>إشارة</div>
              <div className={styles.logoSub}>Isharah</div>
            </div>
          </Link>

          {/* Desktop nav links — hidden on mobile */}
          <div className={styles.navLinks}>
            {navItems.map(({ href, label, isRouter }) =>
              isRouter
                ? <Link key={href} to={href} className={styles.navLink}>{label}</Link>
                : <a    key={href} href={href} className={styles.navLink}>{label}</a>
            )}
          </div>

          {/* CTA + burger — appears on the LEFT in RTL flex-row */}
          <div className={styles.navActions}>
            <Link to={`/${locale}/login`} className={styles.ctaBtn}>
              ابدأ الآن
            </Link>
            <button
              className={styles.burger}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="القائمة"
              aria-expanded={menuOpen}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className={styles.mobileMenu}>
            {navItems.map(({ href, label, isRouter }) =>
              isRouter
                ? <Link key={href} to={href} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{label}</Link>
                : <a    key={href} href={href} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{label}</a>
            )}
            <Link
              to={`/${locale}/login`}
              className={styles.ctaBtn}
              style={{ marginTop: 8, width: "fit-content" }}
              onClick={() => setMenuOpen(false)}
            >
              ابدأ الآن
            </Link>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN
      ══════════════════════════════════════════════════════════════════ */}
      <main className={styles.main}>

        {/* Hero heading — fades in from below */}
        <motion.div
          className={styles.headingBlock}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Pill badge with pulsing dot */}
          <div className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden />
            اختر دورك للمتابعة
          </div>

          {/* Display title — shimmer + glow, same as LP hero */}
          <h1 className={styles.heroTitle}>من أنت؟</h1>

          <p className={styles.heroSub}>
            اختر نوع حسابك للدخول إلى الواجهة المناسبة
          </p>
        </motion.div>

        {/* Role cards — staggered entrance */}
        <motion.div
          className={styles.cardsGrid}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          role="list"
        >
          {roles.map((role) => (
            <motion.div key={role.path} variants={cardVariants} role="listitem">
              <Link
                to={role.path}
                className={styles.cardLink}
                aria-label={`بوابة ${role.title}`}
                onMouseEnter={handleCardEnter(role)}
                onMouseLeave={handleCardLeave}
              >
                {/* Per-role radial sheen (visible on hover via CSS) */}
                <div
                  className={styles.cardSheen}
                  style={{ background: role.sheenGradient }}
                  aria-hidden
                />

                {/* Icon square */}
                <div
                  className={styles.cardIcon}
                  style={{
                    background: role.accentBg,
                    border:     `1px solid ${role.accentBorder}`,
                    color:      role.accent,
                  }}
                >
                  {role.icon}
                </div>

                {/* Text */}
                <div>
                  <p className={styles.cardTitle}>{role.title}</p>
                  <p className={styles.cardDesc}>{role.desc}</p>
                </div>

                {/* CTA */}
                <div className={styles.cardCta} style={{ color: role.accent }}>
                  <span>ادخل الآن</span>
                  <ArrowLeft size={13} aria-hidden />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <p className={styles.footerNote}>
          © 2025 إشارة — مشروع إدوثون 3، جامعة الملك خالد
        </p>
      </main>
    </div>
  );
}
