import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Search, FileText, Download, Trash2 } from "lucide-react";
import { sessionArchive, formatDuration, type ArchivedSession } from "@/utils/sessionArchive";
import s from "./SessionArchive.module.css";

type Tab = 'transcript';

const FILTERS = [
  { id: 'all',     labelAr: 'الكل',       labelEn: 'All' },
  { id: 'arabic',  labelAr: '🇸🇦 عربي',   labelEn: '🇸🇦 Arabic' },
  { id: 'english', labelAr: '🇺🇸 إنجليزي', labelEn: '🇺🇸 English' },
] as const;

type FilterId = typeof FILTERS[number]['id'];

const getTextDir = (text: string): 'rtl' | 'ltr' =>
  /[؀-ۿ]/.test(text.trim()[0] ?? '') ? 'rtl' : 'ltr';

export default function SessionArchive() {
  const { locale = "ar" } = useParams<{ locale: string }>();
  const ar = (a: string, b: string) => (locale === "ar" ? a : b);

  const [sessions,  setSessions]  = useState<ArchivedSession[]>([]);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState<FilterId>('all');
  const [selected,  setSelected]  = useState<ArchivedSession | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('transcript');

  useEffect(() => {
    setSessions(sessionArchive.getAll());
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      const matchSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.transcript.full.toLowerCase().includes(q) ||
        s.lecturerName.toLowerCase().includes(q);
      const matchLang =
        filter === 'all' ||
        (filter === 'arabic'  && s.language.startsWith('ar')) ||
        (filter === 'english' && s.language.startsWith('en'));
      return matchSearch && matchLang;
    });
  }, [sessions, search, filter]);

  const handleDelete = (id: string) => {
    sessionArchive.delete(id);
    setSessions(sessionArchive.getAll());
    if (selected?.id === id) setSelected(null);
  };

  const confidence = selected
    ? `${Math.round(selected.averageConfidence * 100)}%`
    : '—';

  const sttLabel: Record<string, string> = {
    'web-speech': ar('متصفح', 'Browser'),
    'whisper-hf': ar('ويسبر', 'Whisper'),
    'assemblyai': 'AssemblyAI',
    'unknown':    ar('غير محدد', 'Unknown'),
  };

  return (
    <div className={s.page} dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className={s.blobBg} aria-hidden>
        <div className={`${s.blob} ${s.blob1}`} />
        <div className={`${s.blob} ${s.blob2}`} />
      </div>
      <div className={s.gridTex} aria-hidden />

      {/* ── Navbar ── */}
      <nav className={s.nav}>
        <div className={s.navInner}>
          <Link to={`/${locale}`} className={s.logo}>
            <div className={s.logoIcon}><span className={s.logoGlyph}>إ</span></div>
            <span className={s.logoName}>إشارة</span>
          </Link>
          <span className={s.navTitle}>{ar("أرشيف الجلسات", "Session Archive")}</span>
          <Link to={`/${locale}/lecturer`} className={s.navBack}>
            <ChevronLeft size={13} aria-hidden />
            {ar("لوحة المحاضر", "Lecturer Dashboard")}
          </Link>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className={s.main}>
        <div>
          <h1 className={s.pageTitle}>{ar("أرشيف الجلسات", "Session Archive")}</h1>
          <p className={s.pageSubtitle}>
            {ar("جميع جلساتك المسجلة محفوظة هنا", "All your recorded sessions are saved here")}
          </p>
        </div>

        {/* Toolbar */}
        <div className={s.toolbar}>
          <div className={s.searchWrap}>
            <Search size={14} className={s.searchIcon} aria-hidden />
            <input
              className={s.searchInput}
              placeholder={ar("ابحث في الجلسات والنصوص...", "Search sessions and transcripts...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              dir={locale === "ar" ? "rtl" : "ltr"}
              style={{ paddingInlineStart: 38, paddingInlineEnd: 14 }}
            />
          </div>
          <div className={s.filters}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`${s.filterBtn} ${filter === f.id ? s.filterBtnActive : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {locale === "ar" ? f.labelAr : f.labelEn}
              </button>
            ))}
          </div>
          <span className={s.countBadge}>
            {filtered.length} {ar("جلسة", "sessions")}
          </span>
        </div>

        {/* Layout: list + detail */}
        <div className={s.layout}>

          {/* ── Session list ── */}
          <div className={s.listWrap}>
            {filtered.length === 0 ? (
              <div className={s.emptyState}>
                <span className={s.emptyIcon}>📂</span>
                <p className={s.emptyTitle}>
                  {sessions.length === 0
                    ? ar("لا توجد جلسات محفوظة بعد", "No sessions saved yet")
                    : ar("لا توجد نتائج", "No results found")}
                </p>
                <p className={s.emptyDesc}>
                  {sessions.length === 0
                    ? ar("ستظهر الجلسات هنا بعد انتهاء التسجيل", "Sessions will appear here after recording ends")
                    : ar("جرب مصطلح بحث مختلف", "Try a different search term")}
                </p>
              </div>
            ) : (
              filtered.map((session) => (
                <div
                  key={session.id}
                  className={`${s.card} ${selected?.id === session.id ? s.cardActive : ''}`}
                  onClick={() => { setSelected(session); setActiveTab('transcript'); }}
                >
                  <div className={s.cardHeader}>
                    <span className={s.cardTitle}>{session.title}</span>
                    <span className={s.cardCode}>{session.code}</span>
                  </div>
                  <div className={s.cardMeta}>
                    <span>📅 {new Date(session.startedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}</span>
                    <span>⏱ {formatDuration(session.duration)}</span>
                    <span>👤 {session.stats.totalStudents}</span>
                    <span>{session.language.startsWith('ar') ? '🇸🇦' : '🇺🇸'}</span>
                  </div>
                  {session.transcript.full && (
                    <p className={s.cardPreview} dir={getTextDir(session.transcript.full)}>
                      {session.transcript.full.slice(0, 90)}{session.transcript.full.length > 90 ? '...' : ''}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* ── Detail panel ── */}
          {selected ? (
            <div className={s.detail}>
              <div className={s.detailHeader}>
                <div>
                  <h2 className={s.detailTitle}>{selected.title}</h2>
                  <p className={s.detailCode}>
                    {selected.code} · {selected.lecturerName} · {new Date(selected.startedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                  </p>
                </div>
                <div className={s.detailActions}>
                  <button
                    className={s.actionBtn}
                    onClick={() => sessionArchive.exportTxt(selected.id)}
                  >
                    <FileText size={13} aria-hidden />
                    {ar("تصدير نص", "Export .txt")}
                  </button>
                  <button
                    className={s.actionBtn}
                    onClick={() => sessionArchive.exportJson(selected.id)}
                  >
                    <Download size={13} aria-hidden />
                    {ar("تصدير JSON", "Export JSON")}
                  </button>
                  <button
                    className={`${s.actionBtn} ${s.actionBtnDelete}`}
                    onClick={() => handleDelete(selected.id)}
                  >
                    <Trash2 size={13} aria-hidden />
                    {ar("حذف", "Delete")}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className={s.statsRow}>
                {[
                  { label: ar("المدة", "Duration"),      value: formatDuration(selected.duration) },
                  { label: ar("الكلمات", "Words"),       value: selected.transcript.wordCount },
                  { label: ar("الطلاب", "Students"),     value: selected.stats.totalStudents },
                  { label: ar("الطلاب الصم", "Deaf"),    value: selected.stats.deafStudents },
                  { label: ar("المبصرون", "Sighted"),    value: selected.stats.sightedStudents },
                  { label: ar("الدقة", "Confidence"),    value: confidence },
                  { label: ar("محرك STT", "STT Engine"), value: sttLabel[selected.sttSource] ?? selected.sttSource },
                ].map((stat) => (
                  <div key={stat.label} className={s.statCard}>
                    <div className={s.statLabel}>{stat.label}</div>
                    <div className={s.statValue}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className={s.tabBar}>
                <button
                  className={`${s.tab} ${activeTab === 'transcript' ? s.tabActive : ''}`}
                  onClick={() => setActiveTab('transcript')}
                >
                  {ar("النص الكامل", "Full Transcript")}
                </button>
              </div>

              <div className={s.tabContent}>
                {activeTab === 'transcript' && (
                  selected.transcript.full ? (
                    <p
                      className={s.transcriptFull}
                      dir={getTextDir(selected.transcript.full)}
                    >
                      {selected.transcript.full}
                    </p>
                  ) : (
                    <p className={s.transcriptEmpty}>
                      {ar("لا يوجد نص لهذه الجلسة", "No transcript for this session")}
                    </p>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className={s.detail}>
              <div className={s.selectHint}>
                <span className={s.selectHintIcon}>📋</span>
                <p>{ar("اختر جلسة من القائمة لعرض تفاصيلها", "Select a session from the list to view details")}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
