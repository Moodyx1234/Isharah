const ARCHIVE_KEY = 'isharah_session_archive';
const MAX_ENTRIES = 50;

export interface ArchivedSession {
  id: string;
  code: string;
  title: string;
  lecturerName: string;
  language: string;
  startedAt: string;
  endedAt: string;
  duration: number;   // seconds
  transcript: {
    full: string;
    wordCount: number;
  };
  stats: {
    totalStudents: number;
    deafStudents: number;
    sightedStudents: number;
  };
  sttSource: string;
  averageConfidence: number;
}

export interface SaveInput {
  id: string;
  code: string;
  title: string;
  lecturerName: string;
  language: string;
  startedAt: string;
  duration: number;
  fullTranscript: string;
  studentCounts: { total: number; deaf: number; sighted: number };
  sttSource: string;
  averageConfidence: number;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60)   return `${seconds}ث`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}د ${seconds % 60}ث`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}س ${m}د`;
}

export const sessionArchive = {
  getAll(): ArchivedSession[] {
    try {
      return JSON.parse(localStorage.getItem(ARCHIVE_KEY) ?? '[]') as ArchivedSession[];
    } catch {
      return [];
    }
  },

  getById(id: string): ArchivedSession | undefined {
    return this.getAll().find((s) => s.id === id);
  },

  save(input: SaveInput): ArchivedSession {
    const entry: ArchivedSession = {
      id:           input.id,
      code:         input.code,
      title:        input.title,
      lecturerName: input.lecturerName,
      language:     input.language,
      startedAt:    input.startedAt,
      endedAt:      new Date().toISOString(),
      duration:     input.duration,
      transcript: {
        full:      input.fullTranscript,
        wordCount: input.fullTranscript.trim()
          ? input.fullTranscript.trim().split(/\s+/).length
          : 0,
      },
      stats: {
        totalStudents:   input.studentCounts.total,
        deafStudents:    input.studentCounts.deaf,
        sightedStudents: input.studentCounts.sighted,
      },
      sttSource:         input.sttSource,
      averageConfidence: input.averageConfidence,
    };

    const all = this.getAll().filter((s) => s.id !== entry.id); // dedup
    all.unshift(entry);
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(all.slice(0, MAX_ENTRIES)));
    return entry;
  },

  delete(id: string): void {
    const all = this.getAll().filter((s) => s.id !== id);
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(all));
  },

  clear(): void {
    localStorage.removeItem(ARCHIVE_KEY);
  },

  exportTxt(id: string): void {
    const s = this.getById(id);
    if (!s) return;
    const date = new Date(s.startedAt).toLocaleDateString('ar-SA');
    const lines = [
      `جلسة: ${s.title}`,
      `الكود: ${s.code}`,
      `المحاضر: ${s.lecturerName}`,
      `التاريخ: ${date}`,
      `المدة: ${formatDuration(s.duration)}`,
      `عدد الطلاب: ${s.stats.totalStudents}`,
      `عدد الكلمات: ${s.transcript.wordCount}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      s.transcript.full,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `جلسة-${s.code}-${s.startedAt.split('T')[0]}.txt`);
  },

  exportJson(id: string): void {
    const s = this.getById(id);
    if (!s) return;
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `session-${s.code}.json`);
  },
};

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
