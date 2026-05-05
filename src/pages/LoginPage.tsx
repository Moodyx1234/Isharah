import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, Ear, Eye, BookOpen, ArrowLeft, ArrowRight } from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const card = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

interface RoleConfig {
  path: string;
  icon: React.ReactNode;
  gradient: string;
  glow: string;
  border: string;
  accent: string;
  titleKey: string;
  descKey: string;
}

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { locale = "ar" } = useParams<{ locale: string }>();
  const isAr = locale === "ar";
  const BackArrow = isAr ? ArrowRight : ArrowLeft;

  const roles: RoleConfig[] = [
    {
      path: "lecturer",
      icon: <Mic size={36} />,
      gradient: "from-[#021a1a] via-[#052e2e] to-[#0a3d3d]",
      glow: "rgba(20,184,166,0.18)",
      border: "rgba(20,184,166,0.25)",
      accent: "#14b8a6",
      titleKey: isAr ? "محاضر" : "Lecturer",
      descKey: isAr
        ? "ابدأ جلسة وتحكم في المحاضرة بأدوات الوصول الكاملة"
        : "Start a session and control your lecture with full accessibility tools",
    },
    {
      path: "student/deaf",
      icon: <Ear size={36} />,
      gradient: "from-[#06061f] via-[#0d1240] to-[#141a5c]",
      glow: "rgba(99,102,241,0.18)",
      border: "rgba(99,102,241,0.25)",
      accent: "#6366f1",
      titleKey: isAr ? "طالب أصم" : "Deaf Student",
      descKey: isAr
        ? "تابع المحاضرة عبر الترجمة الفورية ولغة الإشارة ثلاثية الأبعاد"
        : "Follow lectures via real-time captions and 3D sign language avatar",
    },
    {
      path: "student/blind",
      icon: <Eye size={36} />,
      gradient: "from-[#110800] via-[#261500] to-[#3a2000]",
      glow: "rgba(245,158,11,0.18)",
      border: "rgba(245,158,11,0.25)",
      accent: "#f59e0b",
      titleKey: isAr ? "طالب كفيف" : "Blind Student",
      descKey: isAr
        ? "استمع إلى وصف الشرائح وملخصات الذكاء الاصطناعي بصوت واضح"
        : "Listen to AI-generated slide descriptions and summaries with clear audio",
    },
    {
      path: "student/sighted",
      icon: <BookOpen size={36} />,
      gradient: "from-[#031209] via-[#052316] to-[#083320]",
      glow: "rgba(16,185,129,0.18)",
      border: "rgba(16,185,129,0.25)",
      accent: "#10b981",
      titleKey: isAr ? "طالب مبصر" : "Sighted Student",
      descKey: isAr
        ? "تابع الشرائح والترجمة الحية والملخصات الذكية في مكان واحد"
        : "Follow slides, live captions, and AI summaries all in one place",
    },
  ];

  return (
    <div className="min-h-screen hero-mesh flex flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <Link
          to={`/${locale}`}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium"
        >
          <BackArrow size={16} />
          {isAr ? "الرئيسية" : "Home"}
        </Link>
        <LanguageToggle />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10 sm:mb-14"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-xs font-semibold text-white/60 mb-5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
            {isAr ? "اختر دورك للمتابعة" : "Choose your role to continue"}
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {isAr ? "من أنت؟" : "Who are you?"}
          </h1>
          <p className="mt-3 text-white/45 text-sm sm:text-base max-w-sm mx-auto">
            {isAr
              ? "اختر نوع حسابك للدخول إلى الواجهة المناسبة"
              : "Select your account type to enter the right interface"}
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 w-full max-w-3xl"
        >
          {roles.map((role) => (
            <motion.div key={role.path} variants={card}>
              <Link
                to={`/${locale}/${role.path}`}
                className="group relative flex flex-col gap-4 rounded-3xl p-6 sm:p-7 overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${role.gradient.replace("from-[", "").replace("] via-[", ", ").replace("] to-[", ", ").replace("]", "")})`,
                  borderColor: role.border,
                  boxShadow: `0 0 0 0 ${role.glow}`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 60px ${role.glow}`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${role.glow}`;
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 50% 0%, ${role.glow} 0%, transparent 65%)`,
                  }}
                />

                <div
                  className="relative h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${role.accent}22`, color: role.accent, border: `1px solid ${role.accent}44` }}
                >
                  {role.icon}
                </div>

                <div className="relative flex flex-col gap-1">
                  <span className="text-lg sm:text-xl font-black text-white leading-tight">
                    {role.titleKey}
                  </span>
                  <p className="text-sm text-white/50 leading-relaxed">
                    {role.descKey}
                  </p>
                </div>

                <div
                  className="relative flex items-center gap-1.5 text-xs font-bold mt-auto transition-colors"
                  style={{ color: role.accent }}
                >
                  <span>{isAr ? "ادخل الآن" : "Enter now"}</span>
                  {isAr ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
