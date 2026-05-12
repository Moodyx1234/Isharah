import {
  useEffect, useRef, useState, useCallback, KeyboardEvent,
} from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import s from './SlideNavigator.module.css';

// ─── PDF worker ───────────────────────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  fileType:     'pdf' | 'image';
  fileUrl:      string;
  slides?:      string[];           // pre-rendered image URLs (image type)
  currentSlide: number;
  onSlideChange?: (index: number) => void;
  readOnly?:    boolean;
}

// ─── PDF utilities ────────────────────────────────────────────────────────────

async function renderPdfPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale = 1.6,
): Promise<string> {
  const page     = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas   = document.createElement('canvas');
  canvas.width   = viewport.width;
  canvas.height  = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas.toDataURL('image/jpeg', 0.88);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SlideNavigator({
  fileType, fileUrl, slides: imageSlidesIn, currentSlide, onSlideChange, readOnly = false,
}: Props) {
  const [slides, setSlides]           = useState<string[]>(imageSlidesIn ?? []);
  const [totalSlides, setTotalSlides] = useState(imageSlidesIn?.length ?? 0);
  const [loading, setLoading]         = useState(fileType === 'pdf');
  const [rendered, setRendered]       = useState<Set<number>>(new Set());
  const [fullscreen, setFullscreen]   = useState(false);

  const pdfRef      = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const stripRef    = useRef<HTMLDivElement>(null);
  const mainRef     = useRef<HTMLDivElement>(null);

  // ── Load PDF ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (fileType !== 'pdf' || !fileUrl) return;
    let cancelled = false;

    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument(fileUrl).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setTotalSlides(pdf.numPages);

        // Pre-render first page immediately
        const firstUrl = await renderPdfPage(pdf, 1);
        if (cancelled) return;
        setSlides([firstUrl]);
        setRendered(new Set([0]));
        setLoading(false);

        // Render remaining pages in background
        for (let i = 2; i <= pdf.numPages; i++) {
          if (cancelled) break;
          const url = await renderPdfPage(pdf, i);
          if (cancelled) break;
          setSlides(prev => { const next = [...prev]; next[i - 1] = url; return next; });
          setRendered(prev => new Set([...prev, i - 1]));
        }
      } catch {
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fileType, fileUrl]);

  // ── Sync image slides ───────────────────────────────────────────────────────
  useEffect(() => {
    if (fileType === 'image' && imageSlidesIn) {
      setSlides(imageSlidesIn);
      setTotalSlides(imageSlidesIn.length);
    }
  }, [fileType, imageSlidesIn]);

  // ── Auto-scroll thumbnail strip ─────────────────────────────────────────────
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const thumb = strip.children[currentSlide] as HTMLElement | undefined;
    if (thumb) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [currentSlide]);

  // ── Keyboard nav ─────────────────────────────────────────────────────────────
  const handleKey = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const delta = e.key === 'ArrowLeft' ? 1 : -1; // RTL: left = next
      const next = Math.max(0, Math.min(currentSlide + delta, totalSlides - 1));
      onSlideChange?.(next);
    }
  }, [readOnly, currentSlide, totalSlides, onSlideChange]);

  const toggleFullscreen = useCallback(() => {
    if (!fullscreen) {
      mainRef.current?.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  }, [fullscreen]);

  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setFullscreen(false); };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const currentUrl = slides[currentSlide];

  if (loading) {
    return (
      <div className={s.loading}>
        <div className={s.spinner} />
        <span>جارٍ تحميل الملف…</span>
      </div>
    );
  }

  return (
    <div className={s.root} onKeyDown={handleKey} tabIndex={0} ref={mainRef}>
      {/* Progress bar */}
      {totalSlides > 1 && (
        <div className={s.progressBar}>
          <div
            className={s.progressFill}
            style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
          />
        </div>
      )}

      {/* Main slide */}
      <div className={s.slideWrap}>
        {currentUrl ? (
          <img
            key={currentSlide}
            src={currentUrl}
            alt={`شريحة ${currentSlide + 1}`}
            className={s.slide}
            draggable={false}
          />
        ) : (
          <div className={s.slideLoading}>
            <div className={s.spinner} />
          </div>
        )}

        {/* Fullscreen button */}
        <button
          className={s.fullscreenBtn}
          onClick={toggleFullscreen}
          title={fullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
          aria-label={fullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
        >
          {fullscreen ? '⛶' : '⛶'}
        </button>

        {/* Slide counter */}
        {totalSlides > 1 && (
          <div className={s.slideCounter}>
            {currentSlide + 1} / {totalSlides}
          </div>
        )}

        {/* Navigation overlay */}
        {!readOnly && totalSlides > 1 && (
          <div className={s.navOverlay}>
            <button
              className={s.navBtn}
              onClick={() => onSlideChange?.(currentSlide - 1)}
              disabled={currentSlide === 0}
              aria-label="الشريحة السابقة"
            >
              →
            </button>
            <span className={s.navCount}>{currentSlide + 1} / {totalSlides}</span>
            <button
              className={s.navBtn}
              onClick={() => onSlideChange?.(currentSlide + 1)}
              disabled={currentSlide >= totalSlides - 1}
              aria-label="الشريحة التالية"
            >
              ←
            </button>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {totalSlides > 1 && (
        <div className={s.strip} ref={stripRef}>
          {Array.from({ length: totalSlides }, (_, i) => (
            <button
              key={i}
              className={`${s.thumb} ${i === currentSlide ? s.thumbActive : ''}`}
              onClick={() => !readOnly && onSlideChange?.(i)}
              aria-label={`الانتقال للشريحة ${i + 1}`}
            >
              {slides[i] ? (
                <img src={slides[i]} alt={`${i + 1}`} className={s.thumbImg} />
              ) : (
                <div className={s.thumbPlaceholder}>{i + 1}</div>
              )}
              {!rendered.has(i) && <div className={s.thumbLoading} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
