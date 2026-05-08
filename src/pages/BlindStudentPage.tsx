import { useState } from "react";
import BlindStudentJoin from "./BlindStudentJoin";
import BlindStudentView from "./BlindStudentView";

export default function BlindStudentPage() {
  const [joined, setJoined] = useState(false);
  return joined
    ? <BlindStudentView />
    : <BlindStudentJoin onJoined={() => setJoined(true)} />;
}
