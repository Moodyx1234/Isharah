import { useState, useCallback } from "react";
import SightedStudentJoin, { SightedTranscriptEntry } from "./SightedStudentJoin";
import SightedStudentView from "./SightedStudentView";

export default function SightedStudentPage() {
  const [joined,            setJoined]            = useState(false);
  const [sessionCode,       setSessionCode]       = useState("");
  const [initialTranscript, setInitialTranscript] = useState<SightedTranscriptEntry[]>([]);

  const handleJoined = useCallback((code: string, transcript: SightedTranscriptEntry[]) => {
    setSessionCode(code);
    setInitialTranscript(transcript);
    setJoined(true);
  }, []);

  return joined
    ? <SightedStudentView sessionCode={sessionCode} initialTranscript={initialTranscript} />
    : <SightedStudentJoin onJoined={handleJoined} />;
}
