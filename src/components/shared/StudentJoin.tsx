import { type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { type SessionEntry, useSessionJoin } from "@/hooks/useSessionJoin";
import s from "./StudentJoin.module.css";

export type { SessionEntry };

export interface JoinPill {
  ar: string;
  en: string;
  icon?: React.ReactElement;
}

interface Props {
  role: "deaf" | "blind" | "sighted";
  icon: React.ReactElement;
  accent: string;
  accentRgb: string;
  roleLabelAr: string;
  roleLabelEn: string;
  titleAr: string;
  titleEn: string;
  subAr: string;
  subEn: string;
  pills: JoinPill[];
  a11yNote?: { ar: string; en: string };
  onJoined: (code: string, transcript: SessionEntry[]) => void;
}

export default function StudentJoin({
  role, icon, accent, accentRgb,
  roleLabelAr, roleLabelEn,
  titleAr, titleEn, subAr, subEn,
  pills, a11yNote, onJoined,
}: Props) {
  const { locale = "ar" } = useParams<{ locale: string }>();
  const isAr = locale === "ar";
  const BackArrow = isAr ? ArrowRight : ArrowLeft;

  const { sessionCode, setSessionCode, notFound, sessionEnded, joinSession } =
    useSessionJoin({ role, onJoined });

  const themeVars = {
    "--join-accent":     accent,
    "--join-accent-rgb": accentRgb,
  } as CSSProperties;

  return (
    <div className={s.page} style={themeVars}>
      {/* Ambient blobs */}
      <div className={s.blobBg} aria-hidden="true">
        <div className={`${s.blob} ${s.blob1}`} />
        <div className={`${s.blob} ${s.blob2}`} />
      </div>
      <div className={s.gridTex} aria-hidden="true" />

      {/* Navbar */}
      <nav className={s.nav} aria-label={isAr ? "شريط التنقل" : "Navigation"}>
        <div className={s.navInner}>
          <Link to={`/${locale}`} className={s.logo} aria-label="إشارة — الرئيسية">
            <div className={s.logoIcon} aria-hidden="true">
              <span className={s.logoGlyph}>إش</span>
            </div>
            <div className={s.logoText}>
              <span className={s.logoName}>إشارة</span>
              <span className={s.logoSub}>Isharah</span>
            </div>
          </Link>

          <div
            className={s.rolePill}
            aria-label={isAr ? `الدور الحالي: ${roleLabelAr}` : `Current role: ${roleLabelEn}`}
          >
            {icon}
            {isAr ? roleLabelAr : roleLabelEn}
          </div>

          <Link to={`/${locale}/login`} className={s.backLink}>
            <BackArrow size={15} aria-hidden="true" />
            {isAr ? "رجوع" : "Back"}
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main className={s.main} id="main-content">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={s.card}
          role="region"
          aria-label={isAr ? "نموذج الانضمام إلى الجلسة" : "Session join form"}
        >
          <div className={s.iconCircle} aria-hidden="true">
            {icon}
          </div>

          <h1 className={s.cardTitle}>{isAr ? titleAr : titleEn}</h1>
          <p className={s.cardSub}>{isAr ? subAr : subEn}</p>

          {/* Alerts */}
          <AnimatePresence>
            {notFound && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={s.errorAlert}
                role="alert"
              >
                {isAr ? "رمز الجلسة غير صحيح أو غير موجود" : "Session code not found or invalid"}
              </motion.div>
            )}
            {sessionEnded && (
              <motion.div
                key="ended"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={s.endedAlert}
                role="alert"
              >
                {isAr ? "انتهت الجلسة" : "Session has ended"}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input row */}
          <div className={s.inputRow}>
            <input
              className={s.codeInput}
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              placeholder={isAr ? "أدخل رمز الجلسة" : "Enter session code"}
              maxLength={6}
              onKeyDown={(e) => { if (e.key === "Enter") joinSession(); }}
              aria-label={isAr ? "رمز الجلسة" : "Session code"}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
            />
            <button className={s.joinBtn} onClick={joinSession}>
              {isAr ? "انضمام" : "Join"}
            </button>
          </div>

          {/* Feature pills */}
          <motion.div
            className={s.pillsRow}
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.35 } } }}
            role="list"
            aria-label={isAr ? "ميزات الصفحة" : "Page features"}
          >
            {pills.map((pill, i) => (
              <motion.span
                key={i}
                className={s.pill}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                role="listitem"
              >
                {pill.icon && <span aria-hidden="true">{pill.icon}</span>}
                {isAr ? pill.ar : pill.en}
              </motion.span>
            ))}
          </motion.div>

          {a11yNote && (
            <p className={s.a11yNote}>
              {isAr ? a11yNote.ar : a11yNote.en}
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
