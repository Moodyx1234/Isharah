import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

// ─── Injected CSS (scoped to .lp) ────────────────────────────────────────────
const LP_CSS = `
  .lp { font-family:'IBM Plex Arabic','Tajawal',sans-serif; direction:rtl; background:#0a0f1a; color:#f0f4f8; overflow-x:hidden; }
  .lp *,.lp *::before,.lp *::after { box-sizing:border-box; }
  .lp h1,.lp h2,.lp h3,.lp h4 { font-family:'Tajawal','IBM Plex Arabic',sans-serif; }
  .lp a { text-decoration:none; color:inherit; }
  .lp-con { max-width:1200px; margin:0 auto; padding:0 clamp(20px,5vw,64px); }

  /* ── Blobs ── */
  @keyframes lp-b1 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(80px,-60px) scale(1.1)} 70%{transform:translate(-40px,40px) scale(0.95)} }
  @keyframes lp-b2 { 0%,100%{transform:translate(0,0) scale(1)} 30%{transform:translate(-70px,80px) scale(1.15)} 70%{transform:translate(50px,-30px) scale(0.9)} }
  @keyframes lp-b3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(60px,70px) scale(1.1)} }
  .lp-blob-1 { animation:lp-b1 22s ease-in-out infinite; }
  .lp-blob-2 { animation:lp-b2 28s ease-in-out infinite; }
  .lp-blob-3 { animation:lp-b3 34s ease-in-out infinite; }

  /* ── Hero title ── */
  @keyframes lp-title-in { from{opacity:0;transform:translateY(36px) scale(0.88)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes lp-shimmer { from{background-position:200% center} to{background-position:-200% center} }
  @keyframes lp-glow { 0%,100%{filter:drop-shadow(0 0 28px rgba(0,201,167,0.4))} 50%{filter:drop-shadow(0 0 72px rgba(0,201,167,0.75))} }
  @keyframes lp-fade-up { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }

  /* ── Scroll indicator ── */
  @keyframes lp-bounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(10px)} }
  .lp-scroll-down { animation:lp-bounce 2.2s ease-in-out infinite; }

  /* ── Button glow ── */
  @keyframes lp-btn-glow { 0%,100%{box-shadow:0 0 20px rgba(0,201,167,0.35),0 4px 20px rgba(0,0,0,0.3)} 50%{box-shadow:0 0 55px rgba(0,201,167,0.7),0 4px 24px rgba(0,0,0,0.3)} }

  /* ── Orbit ── */
  @keyframes lp-orbit-cw  { from{transform:rotate(0deg)}   to{transform:rotate(360deg)} }
  @keyframes lp-orbit-ccw { from{transform:rotate(0deg)}   to{transform:rotate(-360deg)} }
  .lp-orbit-cw  { animation:lp-orbit-cw  20s linear infinite; }
  .lp-orbit-ccw { animation:lp-orbit-ccw 13s linear infinite; }

  /* ── Navbar ── */
  .lp-nav { position:fixed; top:0; left:0; right:0; z-index:100; padding:22px 0; transition:background 0.4s,backdrop-filter 0.4s,border-color 0.4s,padding 0.4s; border-bottom:1px solid transparent; }
  .lp-nav.lp-stuck { background:rgba(10,15,26,0.9); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border-bottom-color:rgba(255,255,255,0.07); padding:13px 0; }
  .lp-nl { color:rgba(240,244,248,0.5); font-size:0.88rem; font-weight:500; transition:color 0.2s; position:relative; padding-bottom:3px; }
  .lp-nl::after { content:''; position:absolute; bottom:0; right:0; width:0; height:2px; background:#00c9a7; border-radius:2px; transition:width 0.3s; }
  .lp-nl:hover { color:#f0f4f8; }
  .lp-nl:hover::after { width:100%; }
  .lp-nl.active { color:#00c9a7; }
  .lp-nl.active::after { width:100%; }

  /* ── Buttons ── */
  .lp-btn-p { display:inline-flex; align-items:center; gap:10px; background:linear-gradient(135deg,#00c9a7 0%,#00a888 100%); color:#fff; font-family:'Tajawal',sans-serif; font-weight:700; font-size:1rem; border:none; border-radius:14px; padding:14px 30px; cursor:pointer; transition:transform 0.2s,box-shadow 0.2s; box-shadow:0 4px 18px rgba(0,201,167,0.3); }
  .lp-btn-p:hover { transform:translateY(-2px); animation:lp-btn-glow 1.8s ease-in-out infinite; }
  .lp-btn-g { display:inline-flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); color:#f0f4f8; font-family:'Tajawal',sans-serif; font-weight:600; font-size:1rem; border:1px solid rgba(255,255,255,0.14); border-radius:14px; padding:14px 30px; cursor:pointer; transition:all 0.2s; }
  .lp-btn-g:hover { background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.28); transform:translateY(-2px); }

  /* ── Badge ── */
  .lp-badge { display:inline-flex; align-items:center; gap:8px; background:rgba(0,201,167,0.1); border:1px solid rgba(0,201,167,0.25); border-radius:100px; padding:8px 20px; color:#00c9a7; font-size:0.8rem; font-weight:600; letter-spacing:0.03em; }

  /* ── Scroll reveal ── */
  .lp-rev { opacity:0; transform:translateY(40px); transition:opacity 0.8s ease,transform 0.8s ease; }
  .lp-rev.lp-in { opacity:1; transform:translateY(0); }
  .lp-d1{transition-delay:.1s} .lp-d2{transition-delay:.2s} .lp-d3{transition-delay:.3s} .lp-d4{transition-delay:.4s}

  /* ── Section tag ── */
  .lp-stag { display:inline-flex; align-items:center; gap:10px; color:#00c9a7; font-size:0.78rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:14px; }
  .lp-stag::before,.lp-stag::after { content:''; display:block; height:1px; width:28px; background:rgba(0,201,167,0.5); }

  /* ── Problem cards ── */
  .lp-card-prob { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:22px; padding:36px 32px; transition:transform 0.35s,border-color 0.35s,box-shadow 0.35s; }
  .lp-card-prob:hover { transform:translateY(-8px); border-color:rgba(0,201,167,0.28); box-shadow:0 32px 80px rgba(0,201,167,0.06); }

  /* ── Solution cards ── */
  .lp-sol-teal { background:linear-gradient(135deg,rgba(0,201,167,0.09) 0%,rgba(0,201,167,0.03) 100%); border:1px solid rgba(0,201,167,0.2); border-radius:24px; padding:36px 32px; transition:transform 0.35s,box-shadow 0.35s; }
  .lp-sol-teal:hover { transform:translateY(-8px); box-shadow:0 32px 80px rgba(0,201,167,0.1); }
  .lp-sol-amber { background:linear-gradient(135deg,rgba(245,166,35,0.09) 0%,rgba(245,166,35,0.03) 100%); border:1px solid rgba(245,166,35,0.2); border-radius:24px; padding:36px 32px; transition:transform 0.35s,box-shadow 0.35s; }
  .lp-sol-amber:hover { transform:translateY(-8px); box-shadow:0 32px 80px rgba(245,166,35,0.1); }

  /* ── Step cards ── */
  .lp-steps-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; position:relative; }
  .lp-steps-grid::before { content:''; position:absolute; top:40px; right:calc(12.5% + 8px); left:calc(12.5% + 8px); height:1px; background:linear-gradient(to left,rgba(0,201,167,0.6),rgba(0,201,167,0.12)); z-index:0; }
  .lp-card-step { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:20px; padding:30px 22px; text-align:center; transition:transform 0.3s,border-color 0.3s; position:relative; z-index:1; }
  .lp-card-step:hover { transform:translateY(-6px); border-color:rgba(0,201,167,0.28); }
  .lp-step-num { width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg,rgba(0,201,167,0.18),rgba(0,201,167,0.06)); border:2px solid rgba(0,201,167,0.45); display:flex; align-items:center; justify-content:center; font-family:'Tajawal',sans-serif; font-size:1.4rem; font-weight:800; color:#00c9a7; margin:0 auto 18px; }

  /* ── Stat number ── */
  .lp-stat-num { font-family:'Tajawal',sans-serif; font-size:2.8rem; font-weight:900; line-height:1.1; letter-spacing:-0.02em; }

  /* ── Footer ── */
  .lp-footer { background:#060a12; border-top:1px solid rgba(255,255,255,0.05); }
  .lp-flink { color:rgba(240,244,248,0.38); font-size:0.85rem; transition:color 0.2s; }
  .lp-flink:hover { color:#00c9a7; }

  /* ── Responsive ── */
  @media(max-width:900px) {
    .lp-nm { display:none!important; }
    .lp-steps-grid { grid-template-columns:1fr 1fr; }
    .lp-steps-grid::before { display:none; }
    .lp-sol-grid { grid-template-columns:1fr!important; }
    .lp-prob-grid { grid-template-columns:1fr!important; }
    .lp-visual-col { display:none!important; }
    .lp-sol-right { grid-column:1!important; }
  }
  @media(max-width:600px) {
    .lp-steps-grid { grid-template-columns:1fr; }
    .lp-hero-ctas { flex-direction:column!important; }
    .lp-stats-bar { flex-direction:column!important; gap:20px!important; }
    .lp-stat-sep { display:none!important; }
  }
`;

// ─── CountUp component ───────────────────────────────────────────────────────
function CountUp({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        const DURATION = 2000;
        const STEPS = 72;
        let step = 0;
        const timer = setInterval(() => {
          step++;
          const p = step / STEPS;
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(parseFloat((to * eased).toFixed(decimals)));
          if (step >= STEPS) { setVal(to); clearInterval(timer); }
        }, DURATION / STEPS);
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, decimals]);

  return (
    <span ref={ref}>
      {prefix}{val.toFixed(decimals)}{suffix}
    </span>
  );
}

// ─── Icon helpers (inline SVG to avoid large icon imports) ───────────────────
const IconUsers = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconBan = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);
const IconBuilding = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconHand = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
  </svg>
);
const IconVolume = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
  </svg>
);
const IconUpload = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IconBrain = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
  </svg>
);
const IconZap = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IconCheck = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const IconArrowLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconChevronDown = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// ─── Main component ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const { locale = "ar" } = useParams<{ locale: string }>();
  const [navStuck, setNavStuck] = useState(false);

  // Inject landing-page styles once
  useEffect(() => {
    const el = document.createElement("style");
    el.setAttribute("data-lp", "1");
    el.textContent = LP_CSS;
    document.head.appendChild(el);
    return () => { try { document.head.removeChild(el); } catch {} };
  }, []);

  // Navbar scroll effect
  useEffect(() => {
    const fn = () => setNavStuck(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Scroll reveal observer
  useEffect(() => {
    const els = document.querySelectorAll(".lp-rev");
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("lp-in"); obs.unobserve(e.target); }
        }),
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const loginPath = `/${locale}/login`;

  return (
    <div className="lp" dir="rtl">
      {/* ══════════════════════════════════════════════════════════════════
          NAV
      ══════════════════════════════════════════════════════════════════ */}
      <nav className={`lp-nav${navStuck ? " lp-stuck" : ""}`}>
        <div className="lp-con" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <a href="#hero" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg,#00c9a7,#009e84)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 20px rgba(0,201,167,0.3)" }}>
              <span style={{ color: "#fff", fontFamily: "Tajawal,sans-serif", fontWeight: 900, fontSize: "1.15rem", lineHeight: 1 }}>إ</span>
            </div>
            <div>
              <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 900, fontSize: "1.15rem", color: "#f0f4f8", lineHeight: 1.2 }}>إشارة</div>
              <div style={{ fontSize: "0.62rem", color: "rgba(240,244,248,0.35)", letterSpacing: "0.09em", textTransform: "uppercase" }}>Isharah</div>
            </div>
          </a>

          {/* Links — desktop */}
          <div className="lp-nm" style={{ display: "flex", gap: 30, alignItems: "center" }}>
            {([
              { href: "#hero",             label: "الرئيسية", active: true  },
              { href: "/problem.html",     label: "المشكلة",  active: false },
              { href: "/solution.html",    label: "الحل",     active: false },
              { href: "/how-it-works.html",label: "كيف يعمل",active: false },
              { href: "/team.html",        label: "الفريق",   active: false },
            ]).map(({ href, label, active }) => (
              <a key={href} href={href} className={`lp-nl${active ? " active" : ""}`}>{label}</a>
            ))}
          </div>

          {/* CTA */}
          <Link to={loginPath} className="lp-btn-p" style={{ fontSize: "0.9rem", padding: "10px 22px" }}>
            ابدأ الآن
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", paddingTop: 90, paddingBottom: 60 }}
      >
        {/* Grid texture */}
        <div
          aria-hidden
          style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }}
        />

        {/* Animated blobs */}
        <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div className="lp-blob-1" style={{ position: "absolute", top: "-15%", right: "-8%", width: "65vw", maxWidth: 700, height: "65vw", maxHeight: 700, background: "radial-gradient(ellipse,rgba(0,201,167,0.16) 0%,transparent 68%)", borderRadius: "50%" }} />
          <div className="lp-blob-2" style={{ position: "absolute", bottom: "-25%", left: "-12%", width: "70vw", maxWidth: 750, height: "70vw", maxHeight: 750, background: "radial-gradient(ellipse,rgba(20,80,200,0.1) 0%,transparent 68%)", borderRadius: "50%" }} />
          <div className="lp-blob-3" style={{ position: "absolute", top: "20%", left: "18%", width: "45vw", maxWidth: 480, height: "45vw", maxHeight: 480, background: "radial-gradient(ellipse,rgba(245,166,35,0.07) 0%,transparent 70%)", borderRadius: "50%" }} />
        </div>

        {/* Content */}
        <div className="lp-con" style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          {/* Floating badge */}
          <div className="lp-badge" style={{ marginBottom: 36, animation: "lp-fade-up 0.5s ease both" }}>
            ✨&nbsp;&nbsp;مشروع إدوثون 3 — جامعة الملك خالد
          </div>

          {/* إشارة — big glowing title */}
          <div
            style={{
              fontFamily: "Tajawal,'IBM Plex Arabic',sans-serif",
              fontSize: "clamp(5.5rem,14vw,10rem)",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              marginBottom: 22,
              backgroundImage: "linear-gradient(135deg,#00c9a7 0%,#a0fae4 38%,#ffffff 56%,#00c9a7 100%)",
              backgroundSize: "280% auto",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "lp-title-in 0.9s cubic-bezier(0.34,1.56,0.64,1) both, lp-shimmer 7s linear 1s infinite, lp-glow 4s ease-in-out 1s infinite",
            }}
          >
            إشارة
          </div>

          {/* Tagline */}
          <p style={{ fontFamily: "Tajawal,sans-serif", fontSize: "clamp(1.1rem,2.8vw,1.45rem)", fontWeight: 600, color: "rgba(240,244,248,0.82)", marginBottom: 18, animation: "lp-fade-up 0.6s 0.3s ease both" }}>
            محاضرة واحدة، مفهومة لكل طالب
          </p>

          {/* Description */}
          <p style={{ maxWidth: 590, fontSize: "clamp(0.9rem,1.4vw,1.02rem)", lineHeight: 1.95, color: "rgba(240,244,248,0.42)", marginBottom: 52, animation: "lp-fade-up 0.6s 0.45s ease both" }}>
            منصة ذكاء اصطناعي تتيح ترجمة المحاضرات الجامعية إلى لغة الإشارة ثلاثية الأبعاد للطلاب الصم، ووصف صوتي ذكي للمحتوى البصري للطلاب المكفوفين — كل ذلك في الوقت الفعلي
          </p>

          {/* CTAs */}
          <div className="lp-hero-ctas" style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 80, animation: "lp-fade-up 0.6s 0.6s ease both" }}>
            <Link to={loginPath} className="lp-btn-p" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              ابدأ العرض التجريبي
              <IconArrowLeft />
            </Link>
            <a href="#problem" className="lp-btn-g" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              تعرف على المزيد
            </a>
          </div>

          {/* Stats bar */}
          <div
            className="lp-stats-bar"
            style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 22, overflow: "hidden", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", animation: "lp-fade-up 0.6s 0.75s ease both" }}
          >
            {/* Stat 1 */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "24px 32px" }}>
              <div className="lp-stat-num" style={{ color: "#00c9a7" }}>
                <CountUp to={2.7} decimals={1} suffix="+" />
              </div>
              <div style={{ color: "rgba(240,244,248,0.38)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.03em" }}>مليون</div>
              <div style={{ color: "rgba(240,244,248,0.5)", fontSize: "0.78rem", textAlign: "center", lineHeight: 1.5 }}>صم وكفيف في السعودية</div>
            </div>
            {/* Separator */}
            <div className="lp-stat-sep" style={{ width: 1, background: "rgba(255,255,255,0.09)", margin: "16px 0" }} />
            {/* Stat 2 */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "24px 32px" }}>
              <div className="lp-stat-num" style={{ color: "#f5a623" }}>
                <CountUp to={30} prefix="+" />
              </div>
              <div style={{ color: "rgba(240,244,248,0.38)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.03em" }}>جامعة</div>
              <div style={{ color: "rgba(240,244,248,0.5)", fontSize: "0.78rem", textAlign: "center", lineHeight: 1.5 }}>سعودية بلا حلول إتاحة</div>
            </div>
            {/* Separator */}
            <div className="lp-stat-sep" style={{ width: 1, background: "rgba(255,255,255,0.09)", margin: "16px 0" }} />
            {/* Stat 3 */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "24px 32px" }}>
              <div className="lp-stat-num" style={{ color: "#ff6b6b" }}>0</div>
              <div style={{ color: "rgba(240,244,248,0.38)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.03em" }}>أدوات</div>
              <div style={{ color: "rgba(240,244,248,0.5)", fontSize: "0.78rem", textAlign: "center", lineHeight: 1.5 }}>إتاحة متخصصة حالياً</div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <a
          href="#problem"
          aria-label="تمرير للأسفل"
          className="lp-scroll-down"
          style={{ position: "absolute", bottom: 32, left: "50%", color: "rgba(255,255,255,0.22)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
        >
          <span style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>اكتشف</span>
          <IconChevronDown />
        </a>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PROBLEM
      ══════════════════════════════════════════════════════════════════ */}
      <section id="problem" style={{ padding: "108px 0", background: "#0d1422" }}>
        <div className="lp-con">
          {/* Heading */}
          <div className="lp-rev" style={{ textAlign: "center", marginBottom: 68 }}>
            <div className="lp-stag" style={{ justifyContent: "center" }}>المشكلة التي نحلها</div>
            <h2 style={{ fontFamily: "Tajawal,sans-serif", fontSize: "clamp(2rem,4vw,2.8rem)", fontWeight: 800, color: "#f0f4f8", lineHeight: 1.25 }}>
              فجوة إتاحة حقيقية في التعليم الجامعي
            </h2>
            <p style={{ marginTop: 16, color: "rgba(240,244,248,0.42)", fontSize: "1rem", maxWidth: 500, margin: "16px auto 0", lineHeight: 1.85 }}>
              الطلاب من ذوي الإعاقة السمعية والبصرية يواجهون حواجز هائلة في متابعة المحاضرات الجامعية
            </p>
          </div>

          {/* Cards */}
          <div className="lp-prob-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
            {/* Card 1 */}
            <div className="lp-card-prob lp-rev lp-d1">
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(0,201,167,0.1)", border: "1px solid rgba(0,201,167,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, color: "#00c9a7" }}>
                <IconUsers />
              </div>
              <div style={{ fontSize: "2.6rem", fontFamily: "Tajawal,sans-serif", fontWeight: 900, color: "#00c9a7", lineHeight: 1.1, marginBottom: 12 }}>
                <CountUp to={2.7} decimals={1} suffix="+" /> مليون
              </div>
              <h3 style={{ fontFamily: "Tajawal,sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "#f0f4f8", marginBottom: 12 }}>
                فرد من ذوي الإعاقة في السعودية
              </h3>
              <p style={{ color: "rgba(240,244,248,0.42)", fontSize: "0.88rem", lineHeight: 1.85 }}>
                يعاني أكثر من 2.7 مليون شخص من الإعاقة السمعية أو البصرية، ومعظمهم محروم من فرص التعليم الجامعي المتكافئة
              </p>
            </div>

            {/* Card 2 */}
            <div className="lp-card-prob lp-rev lp-d2">
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, color: "#ff6b6b" }}>
                <IconBan />
              </div>
              <div style={{ fontSize: "2.6rem", fontFamily: "Tajawal,sans-serif", fontWeight: 900, color: "#ff6b6b", lineHeight: 1.1, marginBottom: 12 }}>
                صفر
              </div>
              <h3 style={{ fontFamily: "Tajawal,sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "#f0f4f8", marginBottom: 12 }}>
                أدوات إتاحة متخصصة متوفرة
              </h3>
              <p style={{ color: "rgba(240,244,248,0.42)", fontSize: "0.88rem", lineHeight: 1.85 }}>
                لا توجد منظومة متكاملة تُتيح المحاضرات الجامعية للطلاب ذوي الإعاقة في الوقت الفعلي داخل الجامعات السعودية
              </p>
            </div>

            {/* Card 3 */}
            <div className="lp-card-prob lp-rev lp-d3">
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, color: "#f5a623" }}>
                <IconBuilding />
              </div>
              <div style={{ fontSize: "2.6rem", fontFamily: "Tajawal,sans-serif", fontWeight: 900, color: "#f5a623", lineHeight: 1.1, marginBottom: 12 }}>
                <CountUp to={30} prefix="+" /> جامعة
              </div>
              <h3 style={{ fontFamily: "Tajawal,sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "#f0f4f8", marginBottom: 12 }}>
                جامعة سعودية تفتقر للحلول
              </h3>
              <p style={{ color: "rgba(240,244,248,0.42)", fontSize: "0.88rem", lineHeight: 1.85 }}>
                تفتقر إلى حلول فعّالة ومتخصصة تضمن المساواة في الوصول إلى التعليم لجميع الطلاب بغض النظر عن إعاقتهم
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SOLUTION
      ══════════════════════════════════════════════════════════════════ */}
      <section id="solution" style={{ padding: "108px 0", background: "#0a0f1a" }}>
        <div className="lp-con">
          {/* Heading */}
          <div className="lp-rev" style={{ textAlign: "center", marginBottom: 76 }}>
            <div className="lp-stag" style={{ justifyContent: "center" }}>الحل</div>
            <h2 style={{ fontFamily: "Tajawal,sans-serif", fontSize: "clamp(2rem,4vw,2.8rem)", fontWeight: 800, color: "#f0f4f8", lineHeight: 1.25 }}>
              ذكاء اصطناعي يُترجم المعرفة<br />لكل الحواس
            </h2>
          </div>

          {/* Split layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 72, alignItems: "center" }}>
            {/* Visual / orbit animation */}
            <div className="lp-visual-col lp-rev" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "relative", width: 320, height: 320 }}>
                {/* Outer ring */}
                <div style={{ position: "absolute", inset: 0, border: "1px dashed rgba(0,201,167,0.18)", borderRadius: "50%" }}>
                  <div className="lp-orbit-cw" style={{ position: "absolute", inset: 0 }}>
                    <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(0,201,167,0.14)", border: "1px solid rgba(0,201,167,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#00c9a7" }}>
                      <IconHand />
                    </div>
                  </div>
                </div>
                {/* Middle ring */}
                <div style={{ position: "absolute", inset: 46, border: "1px dashed rgba(245,166,35,0.18)", borderRadius: "50%" }}>
                  <div className="lp-orbit-ccw" style={{ position: "absolute", inset: 0 }}>
                    <div style={{ position: "absolute", top: -17, left: "50%", transform: "translateX(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(245,166,35,0.14)", border: "1px solid rgba(245,166,35,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f5a623" }}>
                      <IconVolume />
                    </div>
                  </div>
                </div>
                {/* Center orb */}
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 120, height: 120, borderRadius: "50%", background: "linear-gradient(135deg,rgba(0,201,167,0.15),rgba(0,201,167,0.05))", border: "2px solid rgba(0,201,167,0.35)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 60px rgba(0,201,167,0.18), inset 0 0 30px rgba(0,201,167,0.06)" }}>
                  <span style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 900, fontSize: "2.2rem", backgroundImage: "linear-gradient(135deg,#00c9a7,#a0fae4)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>إ</span>
                </div>
                {/* Background glow */}
                <div style={{ position: "absolute", inset: -80, background: "radial-gradient(ellipse,rgba(0,201,167,0.05) 0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
              </div>
            </div>

            {/* Feature cards */}
            <div className="lp-sol-grid lp-sol-right" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 22 }}>
              {/* Deaf */}
              <div className="lp-sol-teal lp-rev">
                <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: "rgba(0,201,167,0.14)", border: "1px solid rgba(0,201,167,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#00c9a7" }}>
                    <IconHand />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "Tajawal,sans-serif", fontSize: "1.2rem", fontWeight: 800, color: "#f0f4f8", marginBottom: 10 }}>
                      لغة إشارة ثلاثية الأبعاد
                    </h3>
                    <p style={{ color: "rgba(240,244,248,0.48)", fontSize: "0.9rem", lineHeight: 1.85 }}>
                      ترجمة آنية للمحاضرات إلى حركات لغة الإشارة ثلاثية الأبعاد عبر أفاتار تفاعلي، مع ترجمة نصية فورية مرئية للطلاب الصم
                    </p>
                    <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {["ترجمة فورية", "أفاتار 3D", "ترجمة نصية"].map((tag) => (
                        <span key={tag} style={{ padding: "4px 12px", borderRadius: 100, background: "rgba(0,201,167,0.09)", border: "1px solid rgba(0,201,167,0.2)", color: "#00c9a7", fontSize: "0.74rem", fontWeight: 600 }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Blind */}
              <div className="lp-sol-amber lp-rev lp-d1">
                <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#f5a623" }}>
                    <IconVolume />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "Tajawal,sans-serif", fontSize: "1.2rem", fontWeight: 800, color: "#f0f4f8", marginBottom: 10 }}>
                      وصف صوتي ذكي بالذكاء الاصطناعي
                    </h3>
                    <p style={{ color: "rgba(240,244,248,0.48)", fontSize: "0.9rem", lineHeight: 1.85 }}>
                      تحليل آني للشرائح والمحتوى البصري وتحويله إلى وصف صوتي تفصيلي واضح، مع ملخصات ذكية قابلة للمراجعة للطلاب المكفوفين
                    </p>
                    <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {["OCR ذكي", "وصف صوتي", "ملخصات فورية"].map((tag) => (
                        <span key={tag} style={{ padding: "4px 12px", borderRadius: 100, background: "rgba(245,166,35,0.09)", border: "1px solid rgba(245,166,35,0.22)", color: "#f5a623", fontSize: "0.74rem", fontWeight: 600 }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════ */}
      <section id="how" style={{ padding: "108px 0", background: "#0d1422" }}>
        <div className="lp-con">
          <div className="lp-rev" style={{ textAlign: "center", marginBottom: 76 }}>
            <div className="lp-stag" style={{ justifyContent: "center" }}>كيف يعمل</div>
            <h2 style={{ fontFamily: "Tajawal,sans-serif", fontSize: "clamp(2rem,4vw,2.8rem)", fontWeight: 800, color: "#f0f4f8" }}>
              من المحاضرة إلى الوصول — في ثوانٍ
            </h2>
          </div>

          <div className="lp-steps-grid">
            {[
              { num: "١", Icon: IconUpload,  title: "رفع المحاضرة",           desc: "يرفع المحاضر المحتوى أو يبث الشاشة مباشرة عبر المنصة بضغطة واحدة", delay: "" },
              { num: "٢", Icon: IconBrain,   title: "تحليل الذكاء الاصطناعي", desc: "تحلل خوارزمياتنا النص والصوت والمحتوى البصري في الوقت الفعلي", delay: "lp-d1" },
              { num: "٣", Icon: IconZap,     title: "ترجمة فورية",            desc: "تُحوّل إشارة المحتوى إلى لغة إشارة ثلاثية الأبعاد أو وصف صوتي ذكي", delay: "lp-d2" },
              { num: "٤", Icon: IconCheck,   title: "وصول الطالب",            desc: "يتابع الطالب المحاضرة بالطريقة المناسبة له — كاملة وواضحة ومتكافئة", delay: "lp-d3" },
            ].map(({ num, Icon, title, desc, delay }) => (
              <div key={num} className={`lp-card-step lp-rev ${delay}`}>
                <div className="lp-step-num">{num}</div>
                <div style={{ width: 48, height: 48, borderRadius: 13, background: "rgba(0,201,167,0.08)", border: "1px solid rgba(0,201,167,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#00c9a7" }}>
                  <Icon />
                </div>
                <h3 style={{ fontFamily: "Tajawal,sans-serif", fontSize: "1rem", fontWeight: 700, color: "#f0f4f8", marginBottom: 10 }}>{title}</h3>
                <p style={{ color: "rgba(240,244,248,0.38)", fontSize: "0.84rem", lineHeight: 1.85 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          TEAM / CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section id="team" style={{ padding: "108px 0", background: "#0a0f1a" }}>
        <div className="lp-con" style={{ textAlign: "center" }}>
          <div className="lp-rev">
            <div className="lp-stag" style={{ justifyContent: "center" }}>الفريق</div>
            <h2 style={{ fontFamily: "Tajawal,sans-serif", fontSize: "clamp(2rem,4vw,2.8rem)", fontWeight: 800, color: "#f0f4f8", marginBottom: 16 }}>
              بُنيت بشغف في إدوثون
            </h2>
            <p style={{ color: "rgba(240,244,248,0.42)", maxWidth: 480, margin: "0 auto 56px", lineHeight: 1.9, fontSize: "0.95rem" }}>
              مشروع إدوثون 3 — جامعة الملك خالد. فريق من المطورين والمصممين ملتزم بجعل التعليم في متناول الجميع
            </p>
          </div>

          {/* CTA card */}
          <div
            className="lp-rev lp-d1"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, padding: "56px 48px", background: "linear-gradient(135deg,rgba(0,201,167,0.07),rgba(0,201,167,0.02))", border: "1px solid rgba(0,201,167,0.16)", borderRadius: 28, maxWidth: 680, margin: "0 auto" }}
          >
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#00c9a7,#009e84)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 48px rgba(0,201,167,0.4)" }}>
              <span style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 900, fontSize: "2rem", color: "#fff" }}>إ</span>
            </div>
            <h3 style={{ fontFamily: "Tajawal,sans-serif", fontSize: "1.65rem", fontWeight: 800, color: "#f0f4f8" }}>جرّب إشارة الآن</h3>
            <p style={{ color: "rgba(240,244,248,0.48)", lineHeight: 1.85, maxWidth: 440, fontSize: "0.95rem" }}>
              ابدأ جلسة تجريبية مجانية وشاهد كيف تُغيّر إشارة تجربة التعليم الجامعي للطلاب من ذوي الإعاقة
            </p>
            <Link to={loginPath} className="lp-btn-p" style={{ fontSize: "1.05rem", padding: "15px 42px" }}>
              ابدأ العرض التجريبي المجاني
              <IconArrowLeft />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer className="lp-footer" style={{ padding: "52px 0 36px" }}>
        <div className="lp-con">
          {/* Top row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "space-between", alignItems: "flex-start", marginBottom: 44, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#00c9a7,#009e84)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontFamily: "Tajawal,sans-serif", fontWeight: 900, fontSize: "1rem" }}>إ</span>
                </div>
                <span style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 900, fontSize: "1.1rem", color: "#f0f4f8" }}>إشارة</span>
              </div>
              <p style={{ color: "rgba(240,244,248,0.32)", fontSize: "0.84rem", maxWidth: 200, lineHeight: 1.8 }}>
                محاضرة واحدة، مفهومة لكل طالب
              </p>
            </div>

            {/* Links */}
            <div style={{ display: "flex", gap: 52 }}>
              <div>
                <div style={{ color: "rgba(240,244,248,0.5)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 18 }}>التنقل</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {([
                    { href: "/problem.html",      label: "المشكلة"  },
                    { href: "/solution.html",     label: "الحل"     },
                    { href: "/how-it-works.html", label: "كيف يعمل" },
                    { href: "/team.html",         label: "الفريق"   },
                    { href: "/contact.html",      label: "تواصل"    },
                  ]).map(({ href, label }) => (
                    <a key={href} href={href} className="lp-flink">{label}</a>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ color: "rgba(240,244,248,0.5)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 18 }}>الأدوار</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Link to={`/${locale}/lecturer`} className="lp-flink">المحاضر</Link>
                  <Link to={`/${locale}/student/deaf`} className="lp-flink">الطالب الأصم</Link>
                  <Link to={`/${locale}/student/blind`} className="lp-flink">الطالب الكفيف</Link>
                  <Link to={`/${locale}/student/sighted`} className="lp-flink">الطالب المبصر</Link>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ color: "rgba(240,244,248,0.22)", fontSize: "0.78rem" }}>
              © 2025 إشارة — مشروع إدوثون 3، جامعة الملك خالد
            </p>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ color: "rgba(240,244,248,0.18)", fontSize: "0.75rem" }}>صُنع بـ</span>
              <span style={{ color: "#00c9a7", fontSize: "0.9rem" }}>♥</span>
              <span style={{ color: "rgba(240,244,248,0.18)", fontSize: "0.75rem" }}>في السعودية</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
