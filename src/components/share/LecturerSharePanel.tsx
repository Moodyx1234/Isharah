import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import FileUploadZone from './FileUploadZone';
import SlideNavigator from './SlideNavigator';
import s from './LecturerSharePanel.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_ICON: Record<string, string> = {
  deaf: '🤟', blind: '👁', sighted: '📖',
};
const ROLE_LABEL: Record<string, string> = {
  deaf: 'أصم', blind: 'كفيف', sighted: 'مبصر',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  sessionCode:   string;
  lecturerName?: string;
}

export default function LecturerSharePanel({
  sessionCode, lecturerName = 'المحاضر',
}: Props) {
  const { locale: _locale } = useParams<{ locale: string }>();
  const userId = useRef(`lecturer_${Date.now()}`).current;

  const {
    sessionState, connectedUsers, raisedHands,
    localStream, connectionStatus, errorMsg: sessionError,
    startScreenShare, stopScreenShare,
    shareFileData, goToSlide, stopSharing, acknowledgeHand,
  } = useSession(sessionCode, 'lecturer', userId, lecturerName);

  const [copied, setCopied]         = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const previewRef    = useRef<HTMLVideoElement>(null);

  // Attach local stream to video elements
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream ?? null;
    if (previewRef.current)    previewRef.current.srcObject    = localStream ?? null;
  }, [localStream]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(sessionCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [sessionCode]);

  const handleStartScreen = useCallback(async () => {
    setShareError(null);
    setShowUpload(false);
    try {
      await startScreenShare();
    } catch (err: unknown) {
      setShareError((err as Error).message);
    }
  }, [startScreenShare]);

  const { shareMode, currentSlide, currentFile } = sessionState;
  const isSharing = shareMode !== 'none';

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>
      {/* Ambient background */}
      <div className={s.blobBg} aria-hidden>
        <div className={`${s.blob} ${s.blob1}`} />
        <div className={`${s.blob} ${s.blob2}`} />
      </div>

      <div className={s.grid}>
        {/* ── LEFT SIDEBAR ── */}
        <aside className={s.sidebar}>

          {/* Session info card */}
          <div className={s.card}>
            <p className={s.cardLabel}>رمز الجلسة</p>
            <div className={s.codeRow}>
              <span className={s.code}>{sessionCode}</span>
              <button className={s.copyBtn} onClick={copyCode} aria-label="نسخ الرمز">
                {copied ? <span className={s.copiedBadge}>تم ✓</span> : '⎘'}
              </button>
            </div>
            <div className={s.studentCount}>
              <span className={`${s.dot} ${connectedUsers.length > 0 ? s.dotGreen : ''}`} />
              {connectedUsers.length} طالب متصل
            </div>
            {connectionStatus !== 'connected' && (
              <p className={s.connStatus}>
                {connectionStatus === 'connecting' ? '🔄 جارٍ الاتصال…'
                  : connectionStatus === 'disconnected' ? '⚠ انقطع الاتصال'
                  : '✕ خطأ في الاتصال'}
              </p>
            )}
          </div>

          {/* Share mode toggles */}
          <div className={s.card}>
            <p className={s.cardLabel}>وضع المشاركة</p>

            <button
              className={`${s.modeBtn} ${shareMode === 'screen' ? s.modeBtnActive : ''}`}
              onClick={shareMode === 'screen' ? stopScreenShare : handleStartScreen}
            >
              <span className={s.modeBtnIcon}>📺</span>
              {shareMode === 'screen' ? 'إيقاف مشاركة الشاشة' : 'مشاركة الشاشة'}
              {shareMode === 'screen' && <span className={s.liveDot} />}
            </button>

            <button
              className={`${s.modeBtn} ${(showUpload || shareMode === 'file') ? s.modeBtnActive : ''}`}
              onClick={() => {
                if (shareMode === 'file') { stopSharing(); return; }
                setShowUpload(v => !v);
              }}
            >
              <span className={s.modeBtnIcon}>📁</span>
              {shareMode === 'file' ? 'إيقاف مشاركة الملف' : 'رفع ملف / شرائح'}
            </button>

            {isSharing && (
              <button className={`${s.modeBtn} ${s.modeBtnStop}`} onClick={stopSharing}>
                <span className={s.modeBtnIcon}>⏹</span>
                إيقاف المشاركة
              </button>
            )}

            {shareError && <p className={s.errorText}>{shareError}</p>}
            {sessionError && <p className={s.errorText}>{sessionError}</p>}
          </div>

          {/* Upload zone (inline in sidebar) */}
          {showUpload && shareMode === 'none' && (
            <div className={s.card}>
              <p className={s.cardLabel}>رفع ملف للعرض</p>
              <FileUploadZone
                sessionCode={sessionCode}
                onSuccess={(result) => {
                  shareFileData(result);
                  setShowUpload(false);
                }}
              />
            </div>
          )}

          {/* Connected students */}
          {connectedUsers.length > 0 && (
            <div className={`${s.card} ${s.cardGrow}`}>
              <p className={s.cardLabel}>الطلاب المتصلون</p>
              <ul className={s.studentList}>
                {connectedUsers.map(u => (
                  <li key={u.socketId} className={s.studentRow}>
                    <span className={s.roleIcon}>{ROLE_ICON[u.role] ?? '👤'}</span>
                    <span className={s.studentName}>
                      {u.userName || `طالب (${ROLE_LABEL[u.role] ?? u.role})`}
                    </span>
                    {u.handRaised && (
                      <button
                        className={s.handBadge}
                        onClick={() => acknowledgeHand(u.socketId)}
                      >
                        🖐 رد
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* ── CENTER MAIN ── */}
        <main className={s.main}>

          {/* Empty state */}
          {shareMode === 'none' && !showUpload && (
            <div className={s.emptyState}>
              <div className={s.emptyIcon}>🖥</div>
              <h2 className={s.emptyTitle}>لا يوجد محتوى مشترك</h2>
              <p className={s.emptySubtitle}>اختر وضع المشاركة من القائمة الجانبية</p>
              <div className={s.quickActions}>
                <button className={s.quickBtn} onClick={handleStartScreen}>
                  📺 مشاركة الشاشة
                </button>
                <button className={s.quickBtn} onClick={() => setShowUpload(true)}>
                  📁 رفع ملف
                </button>
              </div>
            </div>
          )}

          {/* Upload in center (when sidebar upload is active) */}
          {showUpload && shareMode === 'none' && (
            <div className={s.centerUpload}>
              <h3 className={s.uploadTitle}>اختر ملفًا لمشاركته مع الطلاب</h3>
              <div className={s.centerUploadZone}>
                <FileUploadZone
                  sessionCode={sessionCode}
                  onSuccess={(result) => {
                    shareFileData(result);
                    setShowUpload(false);
                  }}
                />
              </div>
            </div>
          )}

          {/* Screen share */}
          {shareMode === 'screen' && (
            <div className={s.screenWrap}>
              <div className={s.liveBadge}>
                <span className={s.redDot} />
                جارٍ البث المباشر
              </div>
              <video
                ref={localVideoRef}
                className={s.screenVideo}
                autoPlay
                muted
                playsInline
              />
              <button className={s.stopBar} onClick={stopScreenShare}>
                ⏹ إيقاف المشاركة
              </button>
            </div>
          )}

          {/* File/slides view */}
          {shareMode === 'file' && currentFile && (
            <div className={s.fileWrap}>
              <SlideNavigator
                fileType={currentFile.type}
                fileUrl={currentFile.url}
                slides={currentFile.slides}
                currentSlide={currentSlide}
                onSlideChange={goToSlide}
                readOnly={false}
              />
            </div>
          )}
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className={s.rightBar}>

          {/* Student preview */}
          <div className={s.card}>
            <p className={s.cardLabel}>ما يراه الطلاب</p>
            <div className={s.previewBox}>
              {shareMode === 'screen' && (
                <video
                  ref={previewRef}
                  className={s.previewVideo}
                  autoPlay
                  muted
                  playsInline
                />
              )}
              {shareMode === 'file' && currentFile && (
                <img
                  src={currentFile.slides?.[currentSlide] ?? currentFile.url}
                  alt="معاينة"
                  className={s.previewImg}
                />
              )}
              {shareMode === 'none' && (
                <div className={s.previewEmpty}>لا يوجد بث</div>
              )}
            </div>
            <p className={s.previewLabel}>معاينة الطلاب</p>
          </div>

          {/* Stats */}
          <div className={s.card}>
            <p className={s.cardLabel}>إحصاءات البث</p>
            <div className={s.statRow}>
              <span className={s.statLabel}>المشاهدون</span>
              <span className={s.statValue}>{connectedUsers.length}</span>
            </div>
            <div className={s.statRow}>
              <span className={s.statLabel}>الجودة</span>
              <span className={s.statValue}>HD</span>
            </div>
            {isSharing && (
              <div className={s.statRow}>
                <span className={s.statLabel}>الحالة</span>
                <span className={`${s.statValue} ${s.statLive}`}>مباشر ●</span>
              </div>
            )}
            {shareMode === 'file' && currentFile && (
              <div className={s.statRow}>
                <span className={s.statLabel}>الشريحة</span>
                <span className={s.statValue}>
                  {currentSlide + 1} / {currentFile.totalSlides ?? 1}
                </span>
              </div>
            )}
          </div>

          {/* Raised hands queue */}
          {raisedHands.length > 0 && (
            <div className={s.card}>
              <p className={s.cardLabel}>الأيدي المرفوعة ({raisedHands.length})</p>
              <ul className={s.handList}>
                {raisedHands.map(h => (
                  <li key={h.socketId} className={s.handItem}>
                    <span className={s.handName}>🖐 {h.userName || 'طالب'}</span>
                    <button
                      className={s.ackBtn}
                      onClick={() => acknowledgeHand(h.socketId)}
                    >
                      رد
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
