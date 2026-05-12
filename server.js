require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const { Server: SocketIOServer } = require("socket.io");
const multer = require("multer");

const port = parseInt(process.env.PORT || "3000", 10);
const app = express();
app.use(express.json({ limit: "10mb" }));

// ─── File upload setup ───────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, req.params.sessionId || "default");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("نوع الملف غير مدعوم — PDF, PNG, JPG فقط"));
  },
});

app.use("/uploads", express.static(UPLOADS_DIR));

app.post("/api/upload/:sessionId", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "فشل الرفع" });
    if (!req.file) return res.status(400).json({ error: "لم يتم اختيار ملف" });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileUrl = `/uploads/${req.params.sessionId}/${req.file.filename}`;
    const fileId  = `file_${Date.now()}`;

    if (ext === ".pdf") {
      return res.json({ fileId, type: "pdf", url: fileUrl, filename: req.file.originalname });
    }
    return res.json({
      fileId, type: "image", url: fileUrl, filename: req.file.originalname,
      totalSlides: 1, slides: [fileUrl],
    });
  });
});

// ─── In-memory stores ────────────────────────────────────────────────────────
const sessions    = new Map(); // sessionId → SessionRoom
const codeToId    = new Map(); // code → sessionId

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SESSION_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateSessionCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += SESSION_CODE_CHARS[Math.floor(Math.random() * SESSION_CODE_CHARS.length)];
  return code;
}

function send(ws, type, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function broadcastToRoom(room, type, payload) {
  const msg = JSON.stringify({ type, payload });
  const all = [room.lecturerWs, ...room.deafClients.values(), ...room.sightedClients.values()];
  for (const ws of all) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

function notifyStudentCount(room) {
  if (!room.lecturerWs || room.lecturerWs.readyState !== WebSocket.OPEN) return;
  send(room.lecturerWs, "STUDENT_COUNT", {
    deaf:    room.deafClients.size,
    sighted: room.sightedClients.size,
    total:   room.deafClients.size + room.sightedClients.size,
  });
}

// ─── REST: Sessions ───────────────────────────────────────────────────────────
app.post("/api/sessions", (req, res) => {
  let code;
  do { code = generateSessionCode(); } while (codeToId.has(code));

  const sessionId = `sess_${Date.now()}`;
  const room = {
    id: sessionId, code,
    title:        req.body.title        || "محاضرة جديدة",
    subject:      req.body.subject      || "عام",
    lecturerName: req.body.lecturerName || "المحاضر",
    status: "WAITING",
    lecturerWs:    null,
    deafClients:   new Map(),
    sightedClients: new Map(),
    transcriptBuffer: [],
    startedAt: null,
  };
  sessions.set(sessionId, room);
  codeToId.set(code, sessionId);

  res.status(201).json({ id: sessionId, code, title: room.title, subject: room.subject, status: "WAITING" });
});

app.get("/api/sessions/:id/transcript", (req, res) => {
  const room = sessions.get(req.params.id);
  if (!room) return res.status(404).json({ message: "الجلسة غير موجودة" });
  res.json(room.transcriptBuffer);
});

// ─── REST: Legacy summarise/rephrase/describe ─────────────────────────────────
app.post("/api/summarize", (req, res) => {
  const { transcript = [], locale = "ar" } = req.body;
  const fullText = transcript.map((e) => e.text || e).join(" ");
  res.json({
    summary:          fullText.slice(0, 300) || (locale === "ar" ? "لا يوجد محتوى بعد." : "No content yet."),
    key_points:       [],
    review_questions: [],
  });
});

app.post("/api/rephrase-for-sign", (req, res) => {
  res.json({ simplified: req.body.text || "", tokens: [] });
});

app.post("/api/describe", (req, res) => {
  const locale = req.body.locale || "ar";
  res.json({ description: locale === "ar" ? "شريحة معروضة." : "Slide displayed.", duration_estimate_seconds: 2 });
});

// ─── Serve static (production) ────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
}

// ─── WebSocket server ────────────────────────────────────────────────────────
const httpServer = createServer(app);
const wss = new WebSocket.Server({ server: httpServer, path: "/ws" });

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) { ws.terminate(); return; }
    ws.isAlive = false;
    ws.ping();
  });
}, 30_000);
wss.on("close", () => clearInterval(heartbeat));

wss.on("connection", (ws) => {
  // All connections accepted — no token required
  ws.isAlive = true;
  ws.sessionId   = null;
  ws.clientType  = null;
  ws.enrollmentId = null;
  ws.guestName   = null;

  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      handleAudioChunk(ws, data);
      return;
    }
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    if (!msg || typeof msg.type !== "string") return;
    routeMessage(ws, msg);
  });

  ws.on("close", () => handleDisconnect(ws));
  ws.on("error", () => { if (ws.readyState !== WebSocket.CLOSED) ws.terminate(); });
});

// ─── Message router ──────────────────────────────────────────────────────────
function routeMessage(ws, msg) {
  const { type, payload = {} } = msg;
  switch (type) {
    case "JOIN_AS_LECTURER": handleJoinAsLecturer(ws, payload); break;
    case "START_SESSION":    handleStartSession(ws, payload);   break;
    case "END_SESSION":      handleEndSession(ws, payload);     break;
    case "JOIN_SESSION":     handleJoinSession(ws, payload);    break;
    case "LEAVE_SESSION":    handleLeaveSession(ws, payload);   break;
    case "RAISE_HAND":       handleRaiseHand(ws, payload);      break;
    case "ASK_QUESTION":     handleAskQuestion(ws, payload);    break;
    default: break;
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────
function handleJoinAsLecturer(ws, { sessionId }) {
  const room = sessions.get(sessionId);
  if (!room) { send(ws, "ERROR", { code: "SESSION_NOT_FOUND", message: "الجلسة غير موجودة" }); return; }
  room.lecturerWs = ws;
  ws.clientType = "LECTURER";
  ws.sessionId  = sessionId;
}

function handleStartSession(ws, { sessionId }) {
  if (ws.clientType !== "LECTURER") {
    send(ws, "ERROR", { code: "FORBIDDEN", message: "للمحاضرين فقط" }); return;
  }
  const room = sessions.get(sessionId);
  if (!room) { send(ws, "ERROR", { code: "SESSION_NOT_FOUND", message: "الجلسة غير موجودة" }); return; }
  room.status = "LIVE";
  room.startedAt = new Date().toISOString();
  broadcastToRoom(room, "SESSION_STARTED", { sessionId, startedAt: room.startedAt });
}

function handleEndSession(ws, { sessionId }) {
  if (ws.clientType !== "LECTURER") return;
  const room = sessions.get(sessionId);
  if (!room) return;
  room.status = "ENDED";
  broadcastToRoom(room, "SESSION_ENDED", { sessionId });
  sessions.delete(sessionId);
  codeToId.delete(room.code);
}

function handleJoinSession(ws, { code, studentType, guestName }) {
  if (!code || code.length !== 6) {
    send(ws, "ERROR", { code: "INVALID_CODE", message: "رمز غير صالح" }); return;
  }
  const sessionId = codeToId.get(code.toUpperCase());
  if (!sessionId) { send(ws, "ERROR", { code: "SESSION_NOT_FOUND", message: "الجلسة غير موجودة" }); return; }
  const room = sessions.get(sessionId);
  if (!room || room.status === "ENDED") {
    send(ws, "ERROR", { code: "SESSION_ENDED", message: "انتهت الجلسة" }); return;
  }

  const enrollmentId = `enroll_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  ws.sessionId    = sessionId;
  ws.enrollmentId = enrollmentId;
  ws.clientType   = studentType === "DEAF" ? "DEAF" : "SIGHTED";
  ws.guestName    = guestName || null;

  if (ws.clientType === "DEAF") room.deafClients.set(enrollmentId, ws);
  else                          room.sightedClients.set(enrollmentId, ws);

  send(ws, "SESSION_JOINED", {
    sessionId,
    title:      room.title,
    subject:    room.subject,
    status:     room.status,
    transcript: room.transcriptBuffer.slice(-50),
  });

  notifyStudentCount(room);
}

function handleLeaveSession(ws, { sessionId }) {
  removeClient(ws);
  send(ws, "SESSION_ENDED", { sessionId });
}

function handleRaiseHand(ws, { sessionId, raised }) {
  if (ws.sessionId !== sessionId) return;
  const room = sessions.get(sessionId);
  if (!room || !room.lecturerWs) return;
  send(room.lecturerWs, "HAND_RAISED", {
    enrollmentId: ws.enrollmentId,
    studentName:  ws.guestName || "طالب",
    raised:       !!raised,
  });
}

function handleAskQuestion(ws, { sessionId, question }) {
  if (ws.sessionId !== sessionId || !question) return;
  const room = sessions.get(sessionId);
  if (!room) return;
  const transcript = room.transcriptBuffer.map((e) => e.text).join(" ");
  const answer = transcript.length > 20
    ? `بناءً على المحاضرة: ${transcript.slice(0, 200)}...`
    : "لا يوجد محتوى كافٍ في المحاضرة للإجابة على سؤالك بعد.";
  send(ws, "QUESTION_ANSWER", { question, answer });
}

function removeClient(ws) {
  if (!ws.sessionId) return;
  const room = sessions.get(ws.sessionId);
  if (!room) return;
  if (ws.enrollmentId) {
    room.deafClients.delete(ws.enrollmentId);
    room.sightedClients.delete(ws.enrollmentId);
    notifyStudentCount(room);
  }
}

function handleDisconnect(ws) {
  removeClient(ws);
}

// ─── Audio chunk handler ──────────────────────────────────────────────────────
const audioByteCounts = new Map();
function handleAudioChunk(ws, data) {
  if (ws.clientType !== "LECTURER" || !ws.sessionId) return;
  const prev = audioByteCounts.get(ws.sessionId) || 0;
  audioByteCounts.set(ws.sessionId, prev + data.length);
}

// ─── Socket.io: Screen & File Sharing ────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  path: "/socket.io",
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// In-memory share sessions (linked to existing sessions by code)
const shareSessions = new Map();

const shareNs = io.of("/share");

shareNs.on("connection", (socket) => {
  // ── join-session ────────────────────────────────────────────────────────────
  socket.on("join-session", ({ sessionCode, role, userId, userName }) => {
    const upperCode = String(sessionCode || "").toUpperCase();
    const sessionId = codeToId.get(upperCode);
    if (!sessionId) {
      socket.emit("error", { code: "SESSION_NOT_FOUND", message: "الجلسة غير موجودة" });
      return;
    }

    if (!shareSessions.has(sessionId)) {
      shareSessions.set(sessionId, {
        sessionId, sessionCode: upperCode,
        lecturer: null,
        students: new Map(),
        shareMode: "none",
        currentFile: null,
        currentSlide: 0,
        isLive: false,
      });
    }

    const ss = shareSessions.get(sessionId);
    socket.data.sessionId = sessionId;
    socket.data.role      = role;
    socket.data.userId    = userId;
    socket.data.userName  = userName;
    socket.join(sessionId);

    if (role === "lecturer") {
      ss.lecturer = socket.id;
      ss.isLive   = true;
    } else {
      ss.students.set(socket.id, { socketId: socket.id, role, userId, userName, handRaised: false });
    }

    // Current state snapshot
    socket.emit("session-state", {
      sessionId,
      shareMode:      ss.shareMode,
      currentFile:    ss.currentFile,
      currentSlide:   ss.currentSlide,
      isLive:         ss.isLive,
      connectedUsers: [...ss.students.values()],
    });

    // Notify room
    if (role !== "lecturer") {
      socket.to(sessionId).emit("user-joined", { socketId: socket.id, role, userId, userName });
      // If screen share already active, tell lecturer to send offer to new student
      if (ss.shareMode === "screen" && ss.lecturer) {
        shareNs.to(ss.lecturer).emit("create-offers-for", { studentIds: [socket.id] });
      }
    }
  });

  // ── Screen sharing ──────────────────────────────────────────────────────────
  socket.on("start-screen-share", () => {
    const ss = shareSessions.get(socket.data.sessionId);
    if (!ss || ss.lecturer !== socket.id) return;
    ss.shareMode    = "screen";
    ss.currentFile  = null;
    ss.currentSlide = 0;
    socket.to(socket.data.sessionId).emit("share-mode-changed", { shareMode: "screen" });
    const studentIds = [...ss.students.keys()];
    if (studentIds.length) socket.emit("create-offers-for", { studentIds });
  });

  socket.on("stop-screen-share", () => {
    const ss = shareSessions.get(socket.data.sessionId);
    if (!ss || ss.lecturer !== socket.id) return;
    ss.shareMode = "none";
    socket.to(socket.data.sessionId).emit("share-stopped");
  });

  // ── WebRTC signaling ────────────────────────────────────────────────────────
  socket.on("webrtc-offer", ({ targetId, offer }) => {
    shareNs.to(targetId).emit("webrtc-offer", { fromId: socket.id, offer });
  });

  socket.on("webrtc-answer", ({ targetId, answer }) => {
    shareNs.to(targetId).emit("webrtc-answer", { fromId: socket.id, answer });
  });

  socket.on("webrtc-ice-candidate", ({ targetId, candidate }) => {
    shareNs.to(targetId).emit("webrtc-ice-candidate", { fromId: socket.id, candidate });
  });

  // ── File sharing ────────────────────────────────────────────────────────────
  socket.on("share-file", (payload) => {
    const ss = shareSessions.get(socket.data.sessionId);
    if (!ss || ss.lecturer !== socket.id) return;
    ss.shareMode    = "file";
    ss.currentFile  = payload;
    ss.currentSlide = 0;
    socket.to(socket.data.sessionId).emit("file-shared", payload);
  });

  socket.on("change-slide", ({ slideIndex }) => {
    const ss = shareSessions.get(socket.data.sessionId);
    if (!ss || ss.lecturer !== socket.id) return;
    ss.currentSlide = slideIndex;
    socket.to(socket.data.sessionId).emit("slide-changed", { slideIndex });
  });

  socket.on("stop-sharing", () => {
    const ss = shareSessions.get(socket.data.sessionId);
    if (!ss || ss.lecturer !== socket.id) return;
    ss.shareMode    = "none";
    ss.currentFile  = null;
    ss.currentSlide = 0;
    socket.to(socket.data.sessionId).emit("share-stopped");
  });

  // ── Hand raise ──────────────────────────────────────────────────────────────
  socket.on("raise-hand", ({ userName: uName }) => {
    const ss = shareSessions.get(socket.data.sessionId);
    if (!ss) return;
    const student = ss.students.get(socket.id);
    if (student) student.handRaised = true;
    if (ss.lecturer) {
      shareNs.to(ss.lecturer).emit("hand-raised", {
        socketId: socket.id,
        userId:   socket.data.userId,
        userName: uName || socket.data.userName,
      });
    }
  });

  socket.on("lower-hand", () => {
    const ss = shareSessions.get(socket.data.sessionId);
    if (!ss) return;
    const student = ss.students.get(socket.id);
    if (student) student.handRaised = false;
    if (ss.lecturer) shareNs.to(ss.lecturer).emit("hand-lowered", { socketId: socket.id });
  });

  socket.on("acknowledge-hand", ({ studentId }) => {
    const ss = shareSessions.get(socket.data.sessionId);
    if (!ss || ss.lecturer !== socket.id) return;
    const student = ss.students.get(studentId);
    if (student) student.handRaised = false;
    shareNs.to(studentId).emit("hand-acknowledged");
    // Broadcast updated list to lecturer
    socket.emit("hand-lowered", { socketId: studentId });
  });

  // ── Disconnect ──────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const ss = shareSessions.get(socket.data.sessionId);
    if (!ss) return;
    if (ss.lecturer === socket.id) {
      ss.isLive    = false;
      ss.shareMode = "none";
      shareNs.to(socket.data.sessionId).emit("session-ended", { reason: "lecturer-left" });
    } else {
      ss.students.delete(socket.id);
      shareNs.to(socket.data.sessionId).emit("user-left", {
        socketId: socket.id,
        userId:   socket.data.userId,
      });
    }
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(port, () => {
  console.log(`✓  Isharah dev server ready → http://localhost:${port}`);
  console.log(`   WebSocket at ws://localhost:${port}/ws`);
  console.log(`   Socket.io share namespace at /share`);
  console.log(`   Open /lecturer — no login needed`);
});
