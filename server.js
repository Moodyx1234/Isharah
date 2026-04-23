const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory session store
const sessions = new Map();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const io = new Server(httpServer, {
    path: "/api/socketio",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("start_session", ({ code, sessionId }) => {
      const session = {
        id: sessionId,
        code,
        lecturerId: socket.id,
        students: new Map(),
        transcript: [],
        currentSlide: null,
        slideDescription: null,
        active: true,
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

      // Send existing transcript and slide to the new student
      socket.emit("session_joined", {
        code,
        transcript: session.transcript,
        currentSlide: session.currentSlide,
        slideDescription: session.slideDescription,
      });

      // Notify lecturer
      const lecturerSocket = io.sockets.sockets.get(session.lecturerId);
      if (lecturerSocket) {
        lecturerSocket.emit("student_joined", {
          id: socket.id,
          role,
          count: session.students.size,
        });
      }
      console.log(`Student ${socket.id} (${role}) joined session: ${code}`);
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
            lecturerSocket.emit("student_left", {
              id: socket.id,
              count: session.students.size,
            });
          }
        }
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`✓ Isharah ready on http://${hostname}:${port}`);
  });
});
