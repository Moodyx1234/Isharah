import { useState, useCallback } from "react";
import DeafStudentJoin, { TranscriptEntry } from "./DeafStudentJoin";
import DeafStudentView from "./DeafStudentView";

export default function DeafStudentPage() {
  const [joined,            setJoined]            = useState(false);
  const [sessionCode,       setSessionCode]       = useState("");
  const [initialTranscript, setInitialTranscript] = useState<TranscriptEntry[]>([]);

  const handleJoined = useCallback((code: string, transcript: TranscriptEntry[]) => {
    setSessionCode(code);
    setInitialTranscript(transcript);
    setJoined(true);
  }, []);

  return joined
    ? <DeafStudentView sessionCode={sessionCode} initialTranscript={initialTranscript} />
    : <DeafStudentJoin onJoined={handleJoined} />;
}
