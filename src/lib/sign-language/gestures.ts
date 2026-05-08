import arslRaw from "@/data/arsl-gestures.json";

/** 15-value tuple: [thumb_prox, thumb_mid, thumb_dist, index_prox, ..., pinky_dist] (radians, 0=extended, +ve=bent) */
export type HandPose = readonly [
  number, number, number, // thumb
  number, number, number, // index
  number, number, number, // middle
  number, number, number, // ring
  number, number, number, // pinky
];

const p = (...v: number[]): HandPose => v as unknown as HandPose;

/** Pre-defined ArSL handshapes */
export const HP: Readonly<Record<string, HandPose>> = {
  OPEN:     p(0.10,0.00,0.00,  0.00,0.00,0.00,  0.00,0.00,0.00,  0.00,0.00,0.00,  0.10,0.00,0.00),
  FIST:     p(1.20,1.20,1.00,  1.50,1.40,1.20,  1.50,1.40,1.20,  1.50,1.40,1.20,  1.40,1.30,1.10),
  POINT:    p(1.20,1.20,1.00,  0.00,0.00,0.00,  1.50,1.40,1.20,  1.50,1.40,1.20,  1.40,1.30,1.10),
  V:        p(1.20,1.20,1.00,  0.00,0.00,0.00,  0.00,0.00,0.00,  1.50,1.40,1.20,  1.40,1.30,1.10),
  FLAT_B:   p(1.00,0.50,0.30,  0.00,0.00,0.00,  0.00,0.00,0.00,  0.00,0.00,0.00,  0.00,0.00,0.00),
  PINCH:    p(0.20,0.60,0.90,  0.30,0.70,0.90,  1.50,1.40,1.20,  1.50,1.40,1.20,  1.40,1.30,1.10),
  OK:       p(0.20,0.50,0.80,  0.30,0.60,0.80,  0.00,0.00,0.00,  0.00,0.00,0.00,  0.10,0.00,0.00),
  L_SHAPE:  p(0.00,0.00,0.00,  0.00,0.00,0.00,  1.50,1.40,1.20,  1.50,1.40,1.20,  1.40,1.30,1.10),
  WAVE:     p(0.20,0.10,0.10,  0.10,0.00,0.00,  0.10,0.00,0.00,  0.10,0.00,0.00,  0.20,0.10,0.00),
  THREE:    p(1.20,1.20,1.00,  0.00,0.00,0.00,  0.00,0.00,0.00,  0.00,0.00,0.00,  1.40,1.30,1.10),
  THUMB_UP: p(0.00,0.00,0.00,  1.50,1.40,1.20,  1.50,1.40,1.20,  1.50,1.40,1.20,  1.40,1.30,1.10),
  FOUR:     p(1.20,1.20,1.00,  0.00,0.00,0.00,  0.00,0.00,0.00,  0.00,0.00,0.00,  0.00,0.00,0.00),
  FIVE:     p(0.10,0.00,0.00,  0.00,0.00,0.00,  0.00,0.00,0.00,  0.00,0.00,0.00,  0.10,0.00,0.00),
  ILY:      p(0.00,0.00,0.00,  0.00,0.00,0.00,  1.50,1.40,1.20,  1.50,1.40,1.20,  0.00,0.00,0.00),
  CUP:      p(0.30,0.40,0.30,  0.40,0.30,0.20,  0.40,0.30,0.20,  0.40,0.30,0.20,  0.50,0.40,0.30),
  D_SHAPE:  p(0.50,0.80,0.60,  0.00,0.00,0.00,  1.50,1.40,1.20,  1.50,1.40,1.20,  1.40,1.30,1.10),
  BENT_V:   p(1.20,1.20,1.00,  0.60,0.80,0.00,  0.60,0.80,0.00,  1.50,1.40,1.20,  1.40,1.30,1.10),
} as const;

export interface GestureKeyframe {
  t: number;
  la?: number;    // leftArmAngle
  ra?: number;    // rightArmAngle
  lfa?: number;   // leftForearmAngle
  rfa?: number;   // rightForearmAngle
  tt?: number;    // torsoTilt
  hn?: number;    // headNod
  hs?: number;    // headShake
  lh?: string;    // left hand HP key
  rh?: string;    // right hand HP key
  ex?: string;    // expression key: neutral | smile | question | emphasis | grateful
}

export interface Gesture {
  id: string;
  nameAr: string;
  nameEn: string;
  durationMs: number;
  leftArmAngle: number;
  rightArmAngle: number;
  leftForearmAngle: number;
  rightForearmAngle: number;
  torsoTilt: number;
  headNod: number;
  headShake?: number;
  leftHand?: HandPose;
  rightHand?: HandPose;
  keyframes?: GestureKeyframe[];
}

export const GESTURES: Record<string, Gesture> = {
  neutral: {
    id: "neutral", nameAr: "وضع الراحة", nameEn: "Neutral", durationMs: 300,
    leftArmAngle: 0, rightArmAngle: 0, leftForearmAngle: 0, rightForearmAngle: 0,
    torsoTilt: 0, headNod: 0,
    leftHand: HP.OPEN, rightHand: HP.OPEN,
  },
  greeting_hello: {
    id: "greeting_hello", nameAr: "مرحباً", nameEn: "Hello", durationMs: 800,
    leftArmAngle: 0, rightArmAngle: 0.8, leftForearmAngle: 0, rightForearmAngle: 0.3,
    torsoTilt: 0, headNod: 0.1,
    leftHand: HP.OPEN, rightHand: HP.WAVE,
  },
  greeting_welcome: {
    id: "greeting_welcome", nameAr: "أهلاً", nameEn: "Welcome", durationMs: 900,
    leftArmAngle: 0.5, rightArmAngle: 0.5, leftForearmAngle: 0.3, rightForearmAngle: 0.3,
    torsoTilt: 0.05, headNod: 0.15,
    leftHand: HP.OPEN, rightHand: HP.OPEN,
  },
  yes: {
    id: "yes", nameAr: "نعم", nameEn: "Yes", durationMs: 600,
    leftArmAngle: 0, rightArmAngle: 0, leftForearmAngle: 0, rightForearmAngle: 0,
    torsoTilt: 0, headNod: 0.3,
    leftHand: HP.OPEN, rightHand: HP.FIST,
  },
  no: {
    id: "no", nameAr: "لا", nameEn: "No", durationMs: 600,
    leftArmAngle: 0, rightArmAngle: 0.6, leftForearmAngle: 0, rightForearmAngle: 0.8,
    torsoTilt: 0, headNod: -0.1, headShake: 0.15,
    leftHand: HP.OPEN, rightHand: HP.POINT,
  },
  thank_you: {
    id: "thank_you", nameAr: "شكراً", nameEn: "Thank you", durationMs: 800,
    leftArmAngle: 0, rightArmAngle: 0.3, leftForearmAngle: 0, rightForearmAngle: 1.0,
    torsoTilt: 0.05, headNod: 0.2,
    leftHand: HP.OPEN, rightHand: HP.FLAT_B,
  },
  question: {
    id: "question", nameAr: "سؤال", nameEn: "Question", durationMs: 700,
    leftArmAngle: 0, rightArmAngle: 1.0, leftForearmAngle: 0, rightForearmAngle: 0.2,
    torsoTilt: 0, headNod: 0.1,
    leftHand: HP.OPEN, rightHand: HP.POINT,
  },
  number_1: {
    id: "number_1", nameAr: "واحد", nameEn: "One", durationMs: 500,
    leftArmAngle: 0, rightArmAngle: 0.4, leftForearmAngle: 0, rightForearmAngle: 1.0,
    torsoTilt: 0, headNod: 0,
    leftHand: HP.OPEN, rightHand: HP.POINT,
  },
  number_2: {
    id: "number_2", nameAr: "اثنان", nameEn: "Two", durationMs: 500,
    leftArmAngle: 0, rightArmAngle: 0.5, leftForearmAngle: 0, rightForearmAngle: 1.0,
    torsoTilt: 0, headNod: 0,
    leftHand: HP.OPEN, rightHand: HP.V,
  },
  number_3: {
    id: "number_3", nameAr: "ثلاثة", nameEn: "Three", durationMs: 500,
    leftArmAngle: 0, rightArmAngle: 0.6, leftForearmAngle: 0, rightForearmAngle: 1.0,
    torsoTilt: 0, headNod: 0,
    leftHand: HP.OPEN, rightHand: HP.THREE,
  },
  number_4: {
    id: "number_4", nameAr: "أربعة", nameEn: "Four", durationMs: 500,
    leftArmAngle: 0, rightArmAngle: 0.65, leftForearmAngle: 0, rightForearmAngle: 1.0,
    torsoTilt: 0, headNod: 0,
    leftHand: HP.OPEN, rightHand: HP.FOUR,
  },
  number_5: {
    id: "number_5", nameAr: "خمسة", nameEn: "Five", durationMs: 500,
    leftArmAngle: 0, rightArmAngle: 0.7, leftForearmAngle: 0, rightForearmAngle: 1.0,
    torsoTilt: 0, headNod: 0,
    leftHand: HP.OPEN, rightHand: HP.FIVE,
  },
  listen: {
    id: "listen", nameAr: "استمع", nameEn: "Listen", durationMs: 700,
    leftArmAngle: 0.2, rightArmAngle: 0.5, leftForearmAngle: 0, rightForearmAngle: 0.8,
    torsoTilt: 0, headNod: 0,
    leftHand: HP.OPEN, rightHand: HP.CUP,
  },
  learn: {
    id: "learn", nameAr: "تعلّم", nameEn: "Learn", durationMs: 900,
    leftArmAngle: 0.4, rightArmAngle: 0.4, leftForearmAngle: 0.6, rightForearmAngle: 0.6,
    torsoTilt: 0, headNod: 0.1,
    leftHand: HP.FLAT_B, rightHand: HP.FLAT_B,
  },
  student: {
    id: "student", nameAr: "طالب", nameEn: "Student", durationMs: 700,
    leftArmAngle: 0.3, rightArmAngle: 0.5, leftForearmAngle: 0.7, rightForearmAngle: 0.3,
    torsoTilt: 0, headNod: 0,
    leftHand: HP.FLAT_B, rightHand: HP.D_SHAPE,
  },
  teacher: {
    id: "teacher", nameAr: "أستاذ", nameEn: "Teacher", durationMs: 700,
    leftArmAngle: 0, rightArmAngle: 0.7, leftForearmAngle: 0, rightForearmAngle: 0.4,
    torsoTilt: 0.05, headNod: 0,
    leftHand: HP.OPEN, rightHand: HP.FIVE,
  },
  today: {
    id: "today", nameAr: "اليوم", nameEn: "Today", durationMs: 600,
    leftArmAngle: 0.5, rightArmAngle: 0.5, leftForearmAngle: 0.3, rightForearmAngle: 0.3,
    torsoTilt: 0, headNod: 0,
    leftHand: HP.OPEN, rightHand: HP.OPEN,
  },
  lecture: {
    id: "lecture", nameAr: "محاضرة", nameEn: "Lecture", durationMs: 800,
    leftArmAngle: 0.6, rightArmAngle: 0.3, leftForearmAngle: 0.4, rightForearmAngle: 0.8,
    torsoTilt: 0.05, headNod: 0,
    leftHand: HP.OPEN, rightHand: HP.POINT,
  },
  algorithm: {
    id: "algorithm", nameAr: "خوارزمية", nameEn: "Algorithm", durationMs: 900,
    leftArmAngle: 0.5, rightArmAngle: 0.7, leftForearmAngle: 0.5, rightForearmAngle: 0.5,
    torsoTilt: 0, headNod: 0.1,
    leftHand: HP.POINT, rightHand: HP.POINT,
  },
  understand: {
    id: "understand", nameAr: "أفهم", nameEn: "Understand", durationMs: 700,
    leftArmAngle: 0, rightArmAngle: 0.3, leftForearmAngle: 0, rightForearmAngle: 1.0,
    torsoTilt: 0.05, headNod: 0.15,
    leftHand: HP.OPEN, rightHand: HP.POINT,
  },
  good: {
    id: "good", nameAr: "جيد", nameEn: "Good", durationMs: 600,
    leftArmAngle: 0, rightArmAngle: 0.5, leftForearmAngle: 0, rightForearmAngle: 0.6,
    torsoTilt: 0, headNod: 0.1,
    leftHand: HP.OPEN, rightHand: HP.THUMB_UP,
  },
  repeat: {
    id: "repeat", nameAr: "كرر", nameEn: "Repeat", durationMs: 800,
    leftArmAngle: 0.3, rightArmAngle: 0.3, leftForearmAngle: 0.5, rightForearmAngle: 0.5,
    torsoTilt: 0, headNod: 0,
    leftHand: HP.POINT, rightHand: HP.POINT,
  },
  important: {
    id: "important", nameAr: "مهم", nameEn: "Important", durationMs: 700,
    leftArmAngle: 0.4, rightArmAngle: 0.4, leftForearmAngle: 0.6, rightForearmAngle: 0.6,
    torsoTilt: 0.05, headNod: 0.1,
    leftHand: HP.OK, rightHand: HP.OK,
  },
  wait: {
    id: "wait", nameAr: "انتظر", nameEn: "Wait", durationMs: 700,
    leftArmAngle: 0.4, rightArmAngle: 0.4, leftForearmAngle: 0.5, rightForearmAngle: 0.5,
    torsoTilt: 0, headNod: 0,
    leftHand: HP.OPEN, rightHand: HP.OPEN,
  },
  begin: {
    id: "begin", nameAr: "ابدأ", nameEn: "Begin", durationMs: 700,
    leftArmAngle: 0, rightArmAngle: 0.6, leftForearmAngle: 0, rightForearmAngle: 0.5,
    torsoTilt: 0, headNod: 0,
    leftHand: HP.OPEN, rightHand: HP.POINT,
  },
  end: {
    id: "end", nameAr: "انتهى", nameEn: "End", durationMs: 700,
    leftArmAngle: 0.3, rightArmAngle: 0.6, leftForearmAngle: 0.4, rightForearmAngle: 0.3,
    torsoTilt: 0.05, headNod: 0,
    leftHand: HP.OPEN, rightHand: HP.FLAT_B,
  },
  study: {
    id: "study", nameAr: "درس", nameEn: "Study", durationMs: 800,
    leftArmAngle: 0.5, rightArmAngle: 0.3, leftForearmAngle: 0.5, rightForearmAngle: 0.7,
    torsoTilt: 0, headNod: 0.1,
    leftHand: HP.FLAT_B, rightHand: HP.FLAT_B,
  },
  help: {
    id: "help", nameAr: "مساعدة", nameEn: "Help", durationMs: 700,
    leftArmAngle: 0.4, rightArmAngle: 0.5, leftForearmAngle: 0.5, rightForearmAngle: 0.4,
    torsoTilt: 0.05, headNod: 0.1,
    leftHand: HP.OPEN, rightHand: HP.THUMB_UP,
  },
  new: {
    id: "new", nameAr: "جديد", nameEn: "New", durationMs: 600,
    leftArmAngle: 0, rightArmAngle: 0.5, leftForearmAngle: 0, rightForearmAngle: 0.7,
    torsoTilt: 0, headNod: 0,
    leftHand: HP.OPEN, rightHand: HP.WAVE,
  },
};

// Merge keyframe data from JSON into GESTURES
const arslData = arslRaw as Record<string, { kf: GestureKeyframe[] }>;
for (const [id, data] of Object.entries(arslData)) {
  if (id in GESTURES) {
    GESTURES[id] = { ...GESTURES[id], keyframes: data.kf };
  }
}

const WORD_TO_GESTURE: Record<string, string> = {
  // Arabic
  "السلام": "greeting_hello",
  "مرحباً": "greeting_hello", "مرحبا": "greeting_hello",
  "أهلاً": "greeting_welcome", "أهلا": "greeting_welcome",
  "نعم": "yes",
  "لا": "no",
  "شكراً": "thank_you", "شكرا": "thank_you",
  "سؤال": "question", "أسئلة": "question",
  "استمع": "listen",
  "تعلّم": "learn", "تعلم": "learn",
  "طالب": "student", "طلاب": "student",
  "أستاذ": "teacher", "محاضر": "teacher",
  "اليوم": "today",
  "محاضرة": "lecture", "درس": "lecture",
  "خوارزمية": "algorithm", "خوارزميات": "algorithm",
  "واحد": "number_1",
  "اثنان": "number_2", "اثنين": "number_2",
  "ثلاثة": "number_3",
  "أربعة": "number_4",
  "خمسة": "number_5",
  "أفهم": "understand", "فهم": "understand",
  "جيد": "good", "ممتاز": "good",
  "كرر": "repeat", "إعادة": "repeat",
  "مهم": "important",
  "انتظر": "wait",
  "ابدأ": "begin", "بداية": "begin",
  "انتهى": "end", "نهاية": "end",
  "دراسة": "study",
  "مساعدة": "help",
  "جديد": "new",
  // English
  "hello": "greeting_hello", "hi": "greeting_hello",
  "welcome": "greeting_welcome",
  "yes": "yes",
  "no": "no",
  "thanks": "thank_you", "thank": "thank_you",
  "question": "question",
  "listen": "listen",
  "learn": "learn", "learning": "learn",
  "student": "student", "students": "student",
  "teacher": "teacher", "professor": "teacher",
  "today": "today",
  "lecture": "lecture",
  "algorithm": "algorithm", "algorithms": "algorithm",
  "one": "number_1",
  "two": "number_2",
  "three": "number_3",
  "four": "number_4",
  "five": "number_5",
  "understand": "understand", "understood": "understand",
  "good": "good", "great": "good",
  "repeat": "repeat", "again": "repeat",
  "important": "important",
  "wait": "wait",
  "begin": "begin", "start": "begin",
  "end": "end", "finish": "end",
  "study": "study",
  "help": "help",
  "new": "new",
};

export function textToGestureTokens(text: string): string[] {
  const words = text.split(/\s+/);
  const tokens: string[] = [];
  for (const word of words) {
    const clean = word.replace(/[،,\.!؟?:]/g, "").trim();
    const id = WORD_TO_GESTURE[clean] ?? WORD_TO_GESTURE[clean.toLowerCase()];
    if (id) tokens.push(id);
    else tokens.push("neutral");
  }
  return tokens.filter((t, i, arr) => !(t === "neutral" && arr[i - 1] === "neutral"));
}
