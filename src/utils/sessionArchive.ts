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
  audio?: {
    base64: string;
    mimeType: string;
    sizeBytes: number;
    durationSec: number;
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
  audioBase64?: string;
  audioMimeType?: string;
  audioSizeBytes?: number;
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
      ...(input.audioBase64 ? {
        audio: {
          base64:      input.audioBase64,
          mimeType:    input.audioMimeType ?? 'audio/webm',
          sizeBytes:   input.audioSizeBytes ?? 0,
          durationSec: input.duration,
        },
      } : {}),
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
    const slice = all.slice(0, MAX_ENTRIES);
    try {
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(slice));
    } catch {
      // Quota exceeded — strip audio blobs from all entries and retry
      const stripped = slice.map((s) => ({ ...s, audio: undefined }));
      try {
        localStorage.setItem(ARCHIVE_KEY, JSON.stringify(stripped));
      } catch {
        localStorage.setItem(ARCHIVE_KEY, JSON.stringify(stripped.slice(0, 20)));
      }
    }
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
    const sep  = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const date = new Date(s.startedAt).toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const lines = [
      sep,
      'منصة إشارة — تفريغ المحاضرة',
      sep,
      '',
      `العنوان: ${s.title}`,
      `الكود: ${s.code}`,
      `المحاضر: ${s.lecturerName}`,
      `التاريخ: ${date}`,
      `المدة: ${formatDuration(s.duration)}`,
      `اللغة: ${s.language.startsWith('ar') ? 'العربية' : 'الإنجليزية'}`,
      `عدد الطلاب: ${s.stats.totalStudents}`,
      `عدد الكلمات: ${s.transcript.wordCount}`,
      '',
      sep,
      'النص الكامل:',
      sep,
      '',
      s.transcript.full || '(لا يوجد نص مسجل لهذه الجلسة)',
      '',
      sep,
      `تم التصدير من منصة إشارة — ${new Date().toLocaleDateString('ar-SA')}`,
      sep,
    ];
    // UTF-8 BOM ensures Arabic renders correctly in Windows Notepad
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `محاضرة-${s.code}-${s.startedAt.split('T')[0]}.txt`);
  },

  exportJson(id: string): void {
    const s = this.getById(id);
    if (!s) return;
    // Strip audio base64 — it's ~150 KB and downloadable separately
    const exportData = {
      ...s,
      audio: s.audio ? {
        mimeType:    s.audio.mimeType,
        sizeBytes:   s.audio.sizeBytes,
        durationSec: s.audio.durationSec,
        note:        'audio file omitted — use the Download Audio button',
      } : undefined,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
    triggerDownload(blob, `session-${s.code}-${s.startedAt.split('T')[0]}.json`);
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
