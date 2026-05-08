import { Ear } from "lucide-react";
import StudentJoin, { type SessionEntry } from "@/components/shared/StudentJoin";

// Re-export so DeafStudentView can continue importing TranscriptEntry from here
export type TranscriptEntry = SessionEntry;

interface Props {
  onJoined: (code: string, transcript: TranscriptEntry[]) => void;
}

const ICON = <Ear size={28} />;

const PILLS = [
  { ar: "🤟 لغة الإشارة ثلاثية الأبعاد", en: "🤟 3D Sign Language" },
  { ar: "📝 ترجمة فورية",                 en: "📝 Live Captions"  },
  { ar: "✨ ملخص ذكي",                    en: "✨ AI Summary"     },
];

export default function DeafStudentJoin({ onJoined }: Props) {
  return (
    <StudentJoin
      role="deaf"
      icon={ICON}
      accent="#00C9A0"
      accentRgb="0,201,160"
      roleLabelAr="طالب أصم"
      roleLabelEn="Deaf Student"
      titleAr="طالب أصم"
      titleEn="Deaf Student"
      subAr="أدخل رمز الجلسة للانضمام"
      subEn="Enter the session code to join"
      pills={PILLS}
      onJoined={onJoined}
    />
  );
}
