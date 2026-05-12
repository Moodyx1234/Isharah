import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession, type Role } from '@/hooks/useSession';
import SlideNavigator from './SlideNavigator';
import s from './StudentContentView.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  sessionCode: string;
  role:        Role;
  userId:      string;
  userName:    string;
}

// ─── TTS helper ───────────────────────────────────────────────────────────────

function speak(text: string, rate = 1): void {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang  = 'ar-SA';
  utt.rate  = rate;
  window.speechSynthesis.speak(utt);
}

// ─── Role meta ────────────────────────────────────────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  deaf:    '#00C9A0',
  blind:   '#F5A623',
  sighted: '#818CF8',
};
const WAITING_MSG: Record<string, string> = {
  deaf:    'سيظهر المحتوى وترجمة لغة الإشارة عند بدء الجلسة',
  blind:   'ستبدأ الأوصاف الصوتية تلقائياً عند بدء الجلسة',
  sighted: 'سيظهر المحتوى والملخصات عند بدء الجلسة',
};
const SIDEBAR_TITLE: Record<string, string> = {
  deaf:    'سجل الترجمة',
  blind:   'ملاحظات صوتية',
  sighted: 'الملخصات الذكية',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentContentView({
  sessionCode, role, userId, userName,
}: Props) {
  const {
    sessionState, remoteStream, connectionStatus, errorMsg,
    handRaised, raiseHand, lowerHand,
  } = useSession(sessionCode, role, userId, userName);

  const { shareMode, currentSlide, currentFile, isLive } = sessionState;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [ttsRate, setTtsRate]       = useState(1);
  const [ttsActive, setTtsActive]   = useState(false);
  const [captionLog, setCaptionLog] = useState<string[]>([]);
  const [sessionEnded, setSessionEnded] = useState(false);

  const accentColor = ROLE_COLOR[role] ?? '#00C9A0';

  // Attach remote stream
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = remoteStream ?? null;
    }
  }, [remoteStream]);

  // Session ended
  useEffect(() => {
    if (!isLive && shareMode === 'none' && connectionStatus === 'connected') {
      setSessionEnded(true);
    }
  }, [isLive, shareMode, connectionStatus]);

  // Blind: auto-describe screen share
  useEffect(() => {
    if (role !== 'blind' || shareMode !== 'screen') return;
    const text = 'بدأ المحاضر مشاركة شاشته. الوصف الصوتي نشط.';
    speak(text, ttsRate);
    setTtsActive(true);
    return () => { window.speechSynthesis?.cancel(); setTtsActive(false); };
  }, [role, shareMode, ttsRate]);

  // Blind: read each new slide
  useEffect(() => {
    if (role !== 'blind' || shareMode !== 'file' || !currentFile) return;
    const text = `الشريحة ${currentSlide + 1} من ${currentFile.totalSlides ?? 1}`;
    speak(text, ttsRate);
    setTtsActive(true);
  }, [role, shareMode, currentSlide, currentFile, ttsRate]);

  // Deaf / sighted: mock caption log for demo
  useEffect(() => {
    if (shareMode === 'none') return;
    setCaptionLog(prev => [
      ...prev,
      shareMode === 'screen'
        ? 'جارٍ عرض الشاشة المباشرة'
        : `شريحة ${currentSlide + 1}`,
    ].slice(-40));
  }, [shareMode, currentSlide]);

  const toggleHand = useCallback(() => {
    if (handRaised) lowerHand();
    else raiseHand();
  }, [handRaised, raiseHand, lowerHand]);

  // ── Session ended overlay ─────────────────────────────────────────────────
  if (sessionEnded) {
    return (
      <div className={s.page}>
        <div className={s.blobBg} aria-hidden>
          <div className={`${s.blob} ${s.blob1}`} style={{ '--accent': accentColor } as React.CSSProperties} />
          <div className={`${s.blob} ${s.blob2}`} />
        </div>
        <div className={s.endedOverlay}>
          <div className={s.endedIcon}>🎓</div>
          <h2 className={s.endedTitle}>انتهت الجلسة</h2>
          <p className={s.endedSub}>شكراً لحضورك — أغلق المحاضر الجلسة</p>
          <a href="/" className={s.homeBtn}>العودة للرئيسية</a>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>
      <div className={s.blobBg} aria-hidden>
        <div className={`${s.blob} ${s.blob1}`} style={{ '--accent': accentColor } as React.CSSProperties} />
        <div className={s.blob} style={{
          bottom: '-18%', left: '-10%',
          width: 'min(50vw, 560px)', height: 'min(50vw, 560px)',
          background: `radial-gradient(ellipse, ${accentColor}0d 0%, transparent 68%)`,
          animation: 'b2 32s ease-in-out infinite',
        }} />
      </div>

      <div className={s.layout}>
        {/* ── MAIN CONTENT (70%) ── */}
        <section className={s.contentArea}>

          {/* Connection error */}
          {errorMsg && (
            <div className={s.errorBanner}>⚠ {errorMsg}</div>
          )}

          {/* Waiting state */}
          {shareMode === 'none' && (
            <div className={s.waiting}>
              <div className={s.waitPulse} style={{ '--accent': accentColor } as React.CSSProperties} />
              <h2 className={s.waitTitle}>في انتظار المحاضر…</h2>
              <p className={s.waitMsg}>{WAITING_MSG[role]}</p>
              <div className={s.waitCode}>
                <span>رمز الجلسة:</span>
                <span className={s.waitCodeVal} style={{ color: accentColor }}>{sessionCode}</span>
              </div>
              {connectionStatus === 'connecting' && (
                <div className={s.connectingTag}>🔄 جارٍ الاتصال…</div>
              )}
            </div>
          )}

          {/* Screen share */}
          {shareMode === 'screen' && (
            <div className={s.videoWrap}>
              <video
                ref={videoRef}
                className={s.video}
                autoPlay
                playsInline
              />

              {/* Blind: TTS indicator */}
              {role === 'blind' && (
                <div className={s.ttsIndicator} style={{ borderColor: `${accentColor}55` }}>
                  🔊 الوصف الصوتي نشط
                </div>
              )}

              {/* Deaf / sighted: caption strip */}
              {(role === 'deaf' || role === 'sighted') && (
                <div className={s.captionStrip}>
                  <p className={s.captionText}>
                    {captionLog[captionLog.length - 1] ?? ''}
                  </p>
                  {role === 'deaf' && (
                    <div className={s.avatarThumb}>🤟</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* File / slides */}
          {shareMode === 'file' && currentFile && (
            <div className={s.slideWrap}>
              {/* Slide counter */}
              <div className={s.slideCountBadge} style={{ color: accentColor, borderColor: `${accentColor}55` }}>
                {currentSlide + 1} / {currentFile.totalSlides ?? 1}
              </div>

              <SlideNavigator
                fileType={currentFile.type}
                fileUrl={currentFile.url}
                slides={currentFile.slides}
                currentSlide={currentSlide}
                readOnly={true}
              />

              {/* Blind: reading indicator */}
              {role === 'blind' && ttsActive && (
                <div className={s.readingIndicator} style={{ color: accentColor }}>
                  🔊 جارٍ قراءة الشريحة…
                </div>
              )}

              {/* Deaf: captions */}
              {role === 'deaf' && (
                <div className={s.captionBar}>
                  <p className={s.captionText}>{captionLog[captionLog.length - 1] ?? ''}</p>
                </div>
              )}

              {/* Sighted: AI summary placeholder */}
              {role === 'sighted' && (
                <div className={s.summaryBar}>
                  <span className={s.summaryLabel}>📝 ملخص الشريحة:</span>
                  <span className={s.summaryText}>
                    {`محتوى الشريحة ${currentSlide + 1} — يعرض المحاضر المادة التعليمية`}
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── ROLE SIDEBAR (30%) ── */}
        <aside className={s.roleSidebar} style={{ '--accent': accentColor } as React.CSSProperties}>

          <div className={s.sideCard}>
            <p className={s.sideLabel}>{SIDEBAR_TITLE[role]}</p>

            {/* Deaf: caption history */}
            {role === 'deaf' && (
              <ul className={s.captionLog}>
                {captionLog.length === 0 ? (
                  <li className={s.captionEmpty}>ستظهر الترجمة هنا…</li>
                ) : (
                  captionLog.slice().reverse().map((line, i) => (
                    <li key={i} className={s.captionLogItem}>{line}</li>
                  ))
                )}
              </ul>
            )}

            {/* Blind: audio notes + speed */}
            {role === 'blind' && (
              <>
                <ul className={s.captionLog}>
                  {captionLog.length === 0 ? (
                    <li className={s.captionEmpty}>ستظهر الملاحظات الصوتية هنا…</li>
                  ) : (
                    captionLog.slice().reverse().map((line, i) => (
                      <li key={i} className={s.captionLogItem}>{line}</li>
                    ))
                  )}
                </ul>
                <div className={s.ttsControls}>
                  <p className={s.ttsLabel}>سرعة القراءة</p>
                  <div className={s.ttsRateBtns}>
                    {[0.75, 1, 1.25, 1.5].map(r => (
                      <button
                        key={r}
                        className={`${s.rateBtn} ${ttsRate === r ? s.rateBtnActive : ''}`}
                        style={ttsRate === r ? { borderColor: accentColor, color: accentColor } : {}}
                        onClick={() => setTtsRate(r)}
                      >
                        {r}×
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Sighted: AI summaries */}
            {role === 'sighted' && (
              <>
                <ul className={s.captionLog}>
                  {captionLog.length === 0 ? (
                    <li className={s.captionEmpty}>ستظهر الملخصات هنا…</li>
                  ) : (
                    captionLog.slice().reverse().map((line, i) => (
                      <li key={i} className={s.captionLogItem}>{line}</li>
                    ))
                  )}
                </ul>
                {shareMode === 'file' && currentFile && (
                  <div className={s.keyPoints}>
                    <p className={s.sideLabel}>نقاط رئيسية</p>
                    <ul className={s.kpList}>
                      <li>محتوى الشريحة {currentSlide + 1}</li>
                      <li>عرض المحاضر المادة التعليمية</li>
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Raise hand */}
          <button
            className={`${s.raiseHandBtn} ${handRaised ? s.raiseHandActive : ''}`}
            style={handRaised
              ? { background: accentColor, color: '#071118', boxShadow: `0 0 20px ${accentColor}66` }
              : { borderColor: `${accentColor}55`, color: accentColor }}
            onClick={toggleHand}
          >
            ✋ {handRaised ? 'تم رفع اليد — انقر للإنزال' : 'رفع اليد'}
          </button>
        </aside>
      </div>
    </div>
  );
}
