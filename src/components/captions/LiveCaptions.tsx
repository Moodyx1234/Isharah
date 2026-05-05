import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface LiveCaptionsProps {
  currentText: string;
  isLive?: boolean;
}

export function LiveCaptions({ currentText, isLive = false }: LiveCaptionsProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return (
    <div
      className="w-full rounded-2xl bg-primary text-white min-h-[80px] flex items-center justify-center px-6 py-4 relative overflow-hidden"
      aria-live="polite"
      aria-atomic="true"
      role="status"
      aria-label="Live captions"
    >
      {isLive && (
        <div className="absolute top-3 end-3 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <span className="text-xs text-white/70 uppercase tracking-wider">Live</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {currentText ? (
          <motion.p
            key={currentText}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="text-xl md:text-2xl font-medium text-center leading-relaxed"
          >
            {currentText}
          </motion.p>
        ) : (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/40 text-center text-base"
          >
            {locale === "ar" ? "في انتظار المحاضر..." : "Waiting for lecturer..."}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
