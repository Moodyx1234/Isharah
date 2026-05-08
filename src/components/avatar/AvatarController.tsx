import { useState, lazy, Suspense } from "react";
import { RotateCcw, Type, Gauge, Loader2 } from "lucide-react";
import s from "./AvatarController.module.css";

const SignAvatar = lazy(() =>
  import("./SignAvatar").then((m) => ({ default: m.SignAvatar }))
);

const SPEEDS = [
  { v: 0.5, label: "0.5×" },
  { v: 1.0, label: "1×"   },
  { v: 1.5, label: "1.5×" },
] as const;

export interface AvatarControllerProps {
  currentGesture: string;
  currentCaption?: string;
  isActive?: boolean;
  speed: number;
  onSpeedChange: (s: number) => void;
  onReplay?: () => void;
  onReplay3?: () => void;
  locale?: string;
  label?: string;
}

export function AvatarController({
  currentGesture,
  currentCaption,
  isActive = false,
  speed,
  onSpeedChange,
  onReplay,
  onReplay3,
  locale = "ar",
  label,
}: AvatarControllerProps) {
  const isAr = locale === "ar";
  const [textOnly, setTextOnly] = useState(false);
  const isIdle = currentGesture === "neutral";

  return (
    <div className={s.wrap}>
      {/* ── View area: 3D avatar or text-only fallback ── */}
      <div className={s.viewArea}>
        {textOnly ? (
          <div className={s.textOnlyView}>
            <p className={s.textOnlyCaption} lang={isAr ? "ar" : "en"}>
              {currentCaption || (isAr ? "في انتظار الإشارة..." : "Waiting for signs...")}
            </p>
          </div>
        ) : (
          <Suspense fallback={<AvatarFallback />}>
            <SignAvatar
              currentGesture={currentGesture}
              isActive={isActive}
              speed={speed}
              label={label ?? (isAr ? "عرض لغة الإشارة" : "Sign language display")}
            />
          </Suspense>
        )}

        {/* Waiting badge when idle (not in text-only mode) */}
        {isIdle && !textOnly && (
          <div
            className={s.waitBadge}
            aria-label={isAr ? "الأفاتار جاهز للترجمة" : "Avatar ready to translate"}
          >
            <span className={s.waitDot} aria-hidden="true" />
            {isAr ? "جاهز للترجمة" : "Ready to translate"}
          </div>
        )}

        {/* ── Controls bar (overlaid at bottom) ── */}
        <div className={s.controls} role="toolbar" aria-label={isAr ? "أدوات التحكم" : "Avatar controls"}>
          {/* Replay buttons */}
          <div className={s.controlGroup} role="group" aria-label={isAr ? "إعادة التشغيل" : "Replay"}>
            <button
              className={s.ctrlBtn}
              onClick={onReplay}
              disabled={!onReplay}
              aria-label={isAr ? "أعد آخر إشارة" : "Replay last sign"}
            >
              <RotateCcw size={11} aria-hidden="true" />
              {isAr ? "×1" : "×1"}
            </button>
            <button
              className={s.ctrlBtn}
              onClick={onReplay3}
              disabled={!onReplay3}
              aria-label={isAr ? "أعد آخر 3 إشارات" : "Replay last 3 signs"}
            >
              <RotateCcw size={11} aria-hidden="true" />
              {isAr ? "×3" : "×3"}
            </button>
          </div>

          <div className={s.ctrlSep} aria-hidden="true" />

          {/* Speed selector */}
          <div className={s.controlGroup} role="group" aria-label={isAr ? "سرعة التشغيل" : "Playback speed"}>
            <Gauge size={11} className={s.ctrlIcon} aria-hidden="true" />
            {SPEEDS.map(({ v, label: lb }) => (
              <button
                key={v}
                className={`${s.ctrlBtn} ${speed === v ? s.ctrlBtnActive : ""}`}
                onClick={() => onSpeedChange(v)}
                aria-pressed={speed === v}
                aria-label={`${isAr ? "السرعة" : "Speed"} ${lb}`}
              >
                {lb}
              </button>
            ))}
          </div>

          <div className={s.ctrlSep} aria-hidden="true" />

          {/* Text-only toggle */}
          <button
            className={`${s.ctrlBtn} ${textOnly ? s.ctrlBtnActive : ""}`}
            onClick={() => setTextOnly((v) => !v)}
            aria-pressed={textOnly}
            aria-label={isAr ? "وضع النص فقط" : "Text-only mode"}
          >
            <Type size={11} aria-hidden="true" />
            {isAr ? "نص" : "Text"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AvatarFallback() {
  return (
    <div className={s.placeholder}>
      <Loader2 size={38} className={s.placeholderIcon} aria-hidden="true" />
    </div>
  );
}
