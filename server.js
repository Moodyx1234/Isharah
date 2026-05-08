require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const WebSocket = require("ws");
const path = require("path");

const port = parseInt(process.env.PORT || "3000", 10);
const app = express();
app.use(express.json({ limit: "10mb" }));

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

// ─── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(port, () => {
  console.log(`✓  Isharah dev server ready → http://localhost:${port}`);
  console.log(`   WebSocket at ws://localhost:${port}/ws`);
  console.log(`   Open /lecturer — no login needed`);
});
