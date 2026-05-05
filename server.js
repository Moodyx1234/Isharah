require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const path = require("path");

const port = parseInt(process.env.PORT || "3000", 10);
const app = express();
app.use(express.json({ limit: "10mb" }));

// ─── In-memory session store ────────────────────────────────────────────────
const sessions = new Map();

// ─── Sign-language gesture map ───────────────────────────────────────────────
const WORD_TO_GESTURE = {
  "السلام": "greeting_hello", "مرحباً": "greeting_hello", "مرحبا": "greeting_hello",
  "أهلاً": "greeting_welcome", "أهلا": "greeting_welcome",
  "نعم": "yes", "لا": "no",
  "شكراً": "thank_you", "شكرا": "thank_you",
  "سؤال": "question", "استمع": "listen",
  "تعلّم": "learn", "تعلم": "learn",
  "طالب": "student", "أستاذ": "teacher", "محاضر": "teacher",
  "اليوم": "today", "محاضرة": "lecture",
  "خوارزمية": "algorithm", "خوارزميات": "algorithm",
  "واحد": "number_1", "اثنان": "number_2", "اثنين": "number_2", "ثلاثة": "number_3",
  "أفهم": "understand",
  hello: "greeting_hello", hi: "greeting_hello",
  welcome: "greeting_welcome",
  yes: "yes", no: "no",
  thanks: "thank_you", thank: "thank_you",
  question: "question", listen: "listen",
  learn: "learn", learning: "learn",
  student: "student", students: "student",
  teacher: "teacher", professor: "teacher",
  today: "today", lecture: "lecture",
  algorithm: "algorithm", algorithms: "algorithm",
  one: "number_1", two: "number_2", three: "number_3",
  understand: "understand",
};

function textToGestureTokens(text) {
  const words = text.split(/\s+/);
  const tokens = [];
  for (const word of words) {
    const clean = word.replace(/[،,\.!؟?]/g, "").trim();
    const gestureId = WORD_TO_GESTURE[clean] || WORD_TO_GESTURE[clean.toLowerCase()];
    tokens.push(gestureId || "neutral");
  }
  return tokens.filter((t, i, arr) => !(t === "neutral" && arr[i - 1] === "neutral"));
}

// ─── Extractive summarizer (zero dependencies, pure JS) ──────────────────────
const AR_STOP = new Set(
  "في من إلى على عن مع هو هي هم نحن أنا أنت كان أن ما لا هذا هذه هؤلاء التي الذي كل بين إذا قد ثم أو و لكن حتى بعد قبل عند".split(" ")
);
const EN_STOP = new Set(
  "the a an is are was were in on at to of and or but it this that for with as by be has have had do does did will would could should may might".split(" ")
);

function extractiveSummarize(fullText, locale) {
  const isAr = locale === "ar";
  const SW = isAr ? AR_STOP : EN_STOP;

  // Split into meaningful sentences
  const sents = fullText
    .split(/[.!?؟\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 5);

  if (sents.length === 0) return null;

  // Build word-frequency table
  const freq = {};
  fullText.split(/\s+/).forEach((w) => {
    const wd = w.replace(/[^\w؀-ۿ]/g, "").toLowerCase();
    if (wd.length > 2 && !SW.has(wd)) freq[wd] = (freq[wd] || 0) + 1;
  });

  // Score each sentence (TF-style, length-normalized)
  const scored = sents
    .map((s) => ({
      s,
      score:
        s.split(/\s+/).reduce((acc, w) => {
          const wd = w.replace(/[^\w؀-ۿ]/g, "").toLowerCase();
          return acc + (freq[wd] || 0);
        }, 0) / Math.sqrt(s.split(/\s+/).length),
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, Math.min(5, sents.length));

  const summary = top
    .slice(0, 3)
    .map((x) => x.s)
    .join(isAr ? ". " : ". ");

  const key_points = top.map((x) => x.s);

  const review_questions = top.map(({ s }) => ({
    q: isAr
      ? `ما المقصود بـ: "${s.slice(0, 70).trimEnd()}..."؟`
      : `What is meant by: "${s.slice(0, 70).trimEnd()}..."?`,
    a: s,
  }));

  return { summary, key_points, review_questions };
}

// ─── Tesseract OCR helper (loaded lazily so startup is instant) ───────────────
let tesseractImport = null;
async function getTesseract() {
  if (!tesseractImport) {
    tesseractImport = await import("tesseract.js");
  }
  return tesseractImport;
}

async function ocrImage(base64Data, locale) {
  const { createWorker } = await getTesseract();
  // Use both languages so slides with mixed content are handled
  const langs = locale === "ar" ? ["ara", "eng"] : ["eng", "ara"];
  const worker = await createWorker(langs, 1, {
    logger: () => {}, // suppress progress logs
    errorHandler: () => {},
  });
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const { data } = await worker.recognize(buffer);
    return (data.text || "").replace(/\s+/g, " ").trim();
  } finally {
    await worker.terminate();
  }
}

// ─── Sample fallback questions ────────────────────────────────────────────────
const sampleQuestionsAr = [
  { q: "ما هو التعقيد الزمني لخوارزمية الفرز الفقاعي في أسوأ الحالات؟", a: "O(n²) حيث n هو حجم البيانات" },
  { q: "ما الفرق الرئيسي بين البحث الخطي والبحث الثنائي؟", a: "البحث الثنائي يعمل فقط على قوائم مرتبة ويقسمها إلى نصفين" },
  { q: "ما هو تعريف الخوارزمية؟", a: "مجموعة من التعليمات المنطقية المرتبة لحل مشكلة معينة" },
];
const sampleQuestionsEn = [
  { q: "What is the time complexity of bubble sort in the worst case?", a: "O(n²) where n is the size of the data" },
  { q: "What is the main difference between linear search and binary search?", a: "Binary search only works on sorted lists and splits them in half" },
  { q: "What is the definition of an algorithm?", a: "A set of ordered logical instructions to solve a specific problem" },
];

// ─── API Routes ───────────────────────────────────────────────────────────────

// Slide description: OCR-based, no API key
app.post("/api/describe", async (req, res) => {
  const { imageData, locale = "ar" } = req.body;
  if (!imageData) return res.status(400).json({ error: "imageData required" });

  try {
    const base64Data = imageData.split(",")[1] || imageData;
    const extractedText = await ocrImage(base64Data, locale);

    let description;
    if (extractedText.length > 15) {
      description =
        locale === "ar"
          ? `تحتوي هذه الشريحة على النص التالي: ${extractedText}`
          : `This slide contains the following text: ${extractedText}`;
    } else {
      description =
        locale === "ar"
          ? "الشريحة تحتوي على محتوى مرئي دون نص بارز."
          : "The slide contains visual content without prominent text.";
    }

    const wordCount = description.split(/\s+/).length;
    res.json({ description, duration_estimate_seconds: Math.ceil(wordCount / 3) });
  } catch (err) {
    console.error("OCR error:", err.message);
    const fallback =
      locale === "ar"
        ? "عُرضت شريحة جديدة. اضغط D لإعادة المحاولة."
        : "A new slide was shown. Press D to retry.";
    res.json({ description: fallback, duration_estimate_seconds: 3 });
  }
});

// Lecture summary: pure extractive NLP, no API key
app.post("/api/summarize", async (req, res) => {
  const { transcript, locale = "ar" } = req.body;
  const fallbackQuestions = locale === "ar" ? sampleQuestionsAr : sampleQuestionsEn;

  if (!transcript || transcript.length === 0) {
    return res.json({
      summary:
        locale === "ar"
          ? "لا يوجد محتوى كافٍ لإنشاء ملخص."
          : "Not enough content to generate a summary.",
      key_points: [],
      review_questions: fallbackQuestions,
    });
  }

  const fullText = transcript.map((e) => e.text).join(" ");
  const result = extractiveSummarize(fullText, locale);

  if (!result) {
    return res.json({
      summary: fullText.slice(0, 200),
      key_points: [],
      review_questions: fallbackQuestions,
    });
  }

  if (result.review_questions.length < 3) {
    result.review_questions.push(...fallbackQuestions.slice(0, 3 - result.review_questions.length));
  }

  res.json(result);
});

// Sign-language simplification: rule-based, no API key
app.post("/api/rephrase-for-sign", (req, res) => {
  const { text = "" } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  const tokens = textToGestureTokens(text);
  res.json({ simplified: text, tokens });
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

// ─── Socket.io ────────────────────────────────────────────────────────────────
const httpServer = createServer(app);

const io = new Server(httpServer, {
  path: "/api/socketio",
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("start_session", ({ code, sessionId }) => {
    const session = {
      id: sessionId, code, lecturerId: socket.id,
      students: new Map(), transcript: [],
      currentSlide: null, slideDescription: null, active: true,
    };
    sessions.set(code, session);
    socket.join(`session:${code}`);
    socket.emit("session_started", { code, sessionId });
    console.log(`Session started: ${code}`);
  });

  socket.on("end_session", ({ code }) => {
    const session = sessions.get(code);
    if (session) {
      session.active = false;
      io.to(`session:${code}`).emit("session_ended", { code });
      sessions.delete(code);
    }
  });

  socket.on("join_session", ({ code, role }) => {
    const session = sessions.get(code);
    if (!session || !session.active) {
      socket.emit("session_not_found", { code });
      return;
    }
    session.students.set(socket.id, { id: socket.id, role, handRaised: false });
    socket.join(`session:${code}`);
    socket.data.sessionCode = code;
    socket.data.role = role;

    socket.emit("session_joined", {
      code,
      transcript: session.transcript,
      currentSlide: session.currentSlide,
      slideDescription: session.slideDescription,
    });

    const lecturerSocket = io.sockets.sockets.get(session.lecturerId);
    if (lecturerSocket) {
      lecturerSocket.emit("student_joined", { id: socket.id, role, count: session.students.size });
    }
    console.log(`Student ${socket.id} (${role}) joined: ${code}`);
  });

  socket.on("transcript_update", ({ code, text, simplified, tokens }) => {
    const session = sessions.get(code);
    if (!session) return;
    const entry = { id: Date.now().toString(), text, simplified, tokens, timestamp: new Date() };
    session.transcript.push(entry);
    io.to(`session:${code}`).emit("new_transcript", entry);
  });

  socket.on("slide_update", ({ code, imageData }) => {
    const session = sessions.get(code);
    if (!session) return;
    session.currentSlide = imageData;
    io.to(`session:${code}`).emit("new_slide", { imageData });
  });

  socket.on("slide_description", ({ code, description }) => {
    const session = sessions.get(code);
    if (!session) return;
    session.slideDescription = description;
    io.to(`session:${code}`).emit("new_slide_description", { description });
  });

  socket.on("raise_hand", ({ code }) => {
    const session = sessions.get(code);
    if (!session) return;
    const student = session.students.get(socket.id);
    if (student) student.handRaised = true;
    const lecturerSocket = io.sockets.sockets.get(session.lecturerId);
    if (lecturerSocket) {
      lecturerSocket.emit("hand_raised", { studentId: socket.id, role: student?.role });
    }
  });

  socket.on("lower_hand", ({ code }) => {
    const session = sessions.get(code);
    if (!session) return;
    const student = session.students.get(socket.id);
    if (student) student.handRaised = false;
  });

  socket.on("disconnect", () => {
    const code = socket.data.sessionCode;
    if (code) {
      const session = sessions.get(code);
      if (session) {
        session.students.delete(socket.id);
        const lecturerSocket = io.sockets.sockets.get(session.lecturerId);
        if (lecturerSocket) {
          lecturerSocket.emit("student_left", { id: socket.id, count: session.students.size });
        }
      }
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(port, () => {
  console.log(`✓ Isharah server ready on http://localhost:${port}`);
  console.log(`  AI: Tesseract.js OCR + Extractive NLP (no API key needed)`);
});
