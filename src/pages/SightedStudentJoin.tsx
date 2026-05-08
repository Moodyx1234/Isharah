import { BookOpen } from "lucide-react";
import StudentJoin, { type SessionEntry } from "@/components/shared/StudentJoin";

export interface SightedTranscriptEntry {
  id: string;
  text: string;
  timestamp?: Date;
}

interface Props {
  onJoined: (code: string, transcript: SightedTranscriptEntry[]) => void;
}

const ICON = <BookOpen size={28} />;

const PILLS = [
  { ar: "📖 ترجمة نصية حية", en: "📖 Live Captions"    },
  { ar: "✨ ملخص ذكي",       en: "✨ AI Summary"        },
  { ar: "❓ أسئلة مراجعة",   en: "❓ Review Questions"  },
];

export default function SightedStudentJoin({ onJoined }: Props) {
  const handleJoined = (code: string, transcript: SessionEntry[]) =>
    onJoined(code, transcript as SightedTranscriptEntry[]);

  return (
    <StudentJoin
      role="sighted"
      icon={ICON}
      accent="#00C9A0"
      accentRgb="0,201,160"
      roleLabelAr="طالب مبصر"
      roleLabelEn="Sighted Student"
      titleAr="طالب مبصر"
      titleEn="Sighted Student"
      subAr="أدخل رمز الجلسة للانضمام إلى المحاضرة"
      subEn="Enter the session code to join the lecture"
      pills={PILLS}
      onJoined={handleJoined}
    />
  );
}
