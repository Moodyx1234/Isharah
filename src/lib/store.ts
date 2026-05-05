import { create } from "zustand";

export type StudentRole = "deaf" | "blind" | "sighted";

export interface ConnectedStudent {
  id: string;
  role: StudentRole;
  handRaised: boolean;
  joinedAt: Date;
}

export interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: Date;
  simplified?: string;
  tokens?: string[];
}

export interface SessionState {
  sessionId: string | null;
  sessionCode: string | null;
  isActive: boolean;
  connectedStudents: ConnectedStudent[];
  transcript: TranscriptEntry[];
  currentCaption: string;
  currentSlideDescription: string | null;
  currentSlideImage: string | null;
  lastNarration: string | null;
  summaryData: SummaryData | null;
  isDemoMode: boolean;
}

export interface SummaryData {
  summary: string;
  keyPoints: string[];
  reviewQuestions: Array<{ q: string; a: string }>;
}

interface SessionActions {
  setSessionId: (id: string) => void;
  setSessionCode: (code: string) => void;
  setActive: (active: boolean) => void;
  addStudent: (student: ConnectedStudent) => void;
  removeStudent: (id: string) => void;
  updateStudentHand: (id: string, raised: boolean) => void;
  addTranscript: (entry: TranscriptEntry) => void;
  setCurrentCaption: (text: string) => void;
  setSlideDescription: (desc: string | null) => void;
  setSlideImage: (img: string | null) => void;
  setLastNarration: (narration: string) => void;
  setSummary: (data: SummaryData) => void;
  setDemoMode: (enabled: boolean) => void;
  reset: () => void;
}

const initialState: SessionState = {
  sessionId: null,
  sessionCode: null,
  isActive: false,
  connectedStudents: [],
  transcript: [],
  currentCaption: "",
  currentSlideDescription: null,
  currentSlideImage: null,
  lastNarration: null,
  summaryData: null,
  isDemoMode: false,
};

export const useSessionStore = create<SessionState & SessionActions>((set) => ({
  ...initialState,
  setSessionId: (id) => set({ sessionId: id }),
  setSessionCode: (code) => set({ sessionCode: code }),
  setActive: (active) => set({ isActive: active }),
  addStudent: (student) => set((s) => ({ connectedStudents: [...s.connectedStudents, student] })),
  removeStudent: (id) => set((s) => ({ connectedStudents: s.connectedStudents.filter((st) => st.id !== id) })),
  updateStudentHand: (id, raised) =>
    set((s) => ({ connectedStudents: s.connectedStudents.map((st) => (st.id === id ? { ...st, handRaised: raised } : st)) })),
  addTranscript: (entry) => set((s) => ({ transcript: [...s.transcript, entry] })),
  setCurrentCaption: (text) => set({ currentCaption: text }),
  setSlideDescription: (desc) => set({ currentSlideDescription: desc }),
  setSlideImage: (img) => set({ currentSlideImage: img }),
  setLastNarration: (narration) => set({ lastNarration: narration }),
  setSummary: (data) => set({ summaryData: data }),
  setDemoMode: (enabled) => set({ isDemoMode: enabled }),
  reset: () => set(initialState),
}));
