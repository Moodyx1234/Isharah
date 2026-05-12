import { useRef, useState, DragEvent, ChangeEvent, useCallback } from 'react';
import s from './FileUploadZone.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadState = 'idle' | 'drag' | 'uploading' | 'success' | 'error';

interface UploadResult {
  fileId:       string;
  type:         'pdf' | 'image';
  url:          string;
  filename:     string;
  totalSlides?: number;
  slides?:      string[];
}

interface Props {
  sessionCode: string;
  onSuccess:   (result: UploadResult) => void;
}

const ACCEPTED = '.pdf,.png,.jpg,.jpeg';
const ACCEPT_DISPLAY = 'PDF, PNG, JPG';

// ─── Component ────────────────────────────────────────────────────────────────

export default function FileUploadZone({ sessionCode, onSuccess }: Props) {
  const [state, setState]       = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [filename, setFilename] = useState('');
  const [result, setResult]     = useState<UploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const doUpload = useCallback((file: File) => {
    setFilename(file.name);
    setState('uploading');
    setProgress(0);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data: UploadResult = JSON.parse(xhr.responseText);
        setResult(data);
        setState('success');
        setProgress(100);
      } else {
        let msg = 'فشل الرفع — حاول مجدداً';
        try { msg = JSON.parse(xhr.responseText)?.error ?? msg; } catch { /* */ }
        setErrorMsg(msg);
        setState('error');
      }
    };

    xhr.onerror = () => {
      setErrorMsg('فشل الرفع — تحقق من اتصالك');
      setState('error');
    };

    xhr.open('POST', `/api/upload/${sessionCode}`);
    xhr.send(formData);
  }, [sessionCode]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setState('idle');
    const file = e.dataTransfer.files[0];
    if (file) doUpload(file);
  }, [doUpload]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    e.target.value = '';
  }, [doUpload]);

  const reset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setFilename('');
    setResult(null);
    setErrorMsg('');
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (state === 'idle' || state === 'drag') {
    return (
      <div
        className={`${s.zone} ${state === 'drag' ? s.drag : ''}`}
        onDragOver={(e) => { e.preventDefault(); setState('drag'); }}
        onDragLeave={() => setState('idle')}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="منطقة رفع الملفات"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className={s.hiddenInput}
          onChange={handleChange}
        />
        <div className={s.uploadIcon}>📁</div>
        <p className={s.zonePrimary}>اسحب ملفك هنا أو انقر للاختيار</p>
        <p className={s.zoneSecondary}>{ACCEPT_DISPLAY} — حتى 50 ميجابايت</p>
      </div>
    );
  }

  if (state === 'uploading') {
    return (
      <div className={s.uploadingBox}>
        <div className={s.uploadingHeader}>
          <span className={s.filenameLabel}>📄 {filename}</span>
          <span className={s.pctLabel}>{progress}%</span>
        </div>
        <div className={s.progressTrack}>
          <div className={s.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <p className={s.uploadingMsg}>جارٍ الرفع…</p>
      </div>
    );
  }

  if (state === 'success' && result) {
    return (
      <div className={s.successBox}>
        <div className={s.successIcon}>✓</div>
        <p className={s.successFilename}>{result.filename}</p>
        {result.type === 'pdf' ? (
          <p className={s.successMeta}>ملف PDF جاهز للعرض</p>
        ) : (
          <p className={s.successMeta}>صورة — {result.totalSlides} شريحة</p>
        )}
        <button
          className={s.shareNowBtn}
          onClick={() => { onSuccess(result); }}
        >
          مشاركة الآن ←
        </button>
        <button className={s.resetBtn} onClick={reset}>رفع ملف آخر</button>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={s.errorBox}>
        <div className={s.errorIcon}>✕</div>
        <p className={s.errorMsg}>{errorMsg}</p>
        <button className={s.retryBtn} onClick={reset}>حاول مجدداً</button>
      </div>
    );
  }

  return null;
}
