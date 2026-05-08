import { Eye, Volume2, Keyboard, Wifi } from "lucide-react";
import StudentJoin, { type SessionEntry } from "@/components/shared/StudentJoin";

interface Props {
  onJoined: () => void;
}

const ICON = <Eye size={28} />;

const PILLS = [
  { ar: "تحويل نص لصوت",           en: "Text-to-speech",       icon: <Volume2  size={11} /> },
  { ar: "اختصارات لوحة المفاتيح",  en: "Keyboard shortcuts",   icon: <Keyboard size={11} /> },
  { ar: "مزامنة فورية",            en: "Live sync",             icon: <Wifi     size={11} /> },
];

const A11Y_NOTE = {
  ar: "متوافق مع قارئات الشاشة • تنقل كامل بلوحة المفاتيح",
  en: "Screen reader compatible • Full keyboard navigation",
};

export default function BlindStudentJoin({ onJoined }: Props) {
  const handleJoined = (_code: string, _transcript: SessionEntry[]) => onJoined();

  return (
    <StudentJoin
      role="blind"
      icon={ICON}
      accent="#F5A623"
      accentRgb="245,166,35"
      roleLabelAr="طالب كفيف"
      roleLabelEn="Blind Student"
      titleAr="انضم إلى الجلسة"
      titleEn="Join Session"
      subAr="أدخل رمز الجلسة المكوّن من 6 أحرف للانضمام إلى المحاضرة"
      subEn="Enter the 6-character session code to join the lecture"
      pills={PILLS}
      a11yNote={A11Y_NOTE}
      onJoined={handleJoined}
    />
  );
}
