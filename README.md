# إشارة — Isharah

**One lecture, understood by every student**
**محاضرة واحدة، مفهومة لكل طالب**

An AI-powered accessibility platform that makes university lectures accessible to deaf and blind students in real-time, using 3D sign language avatars and intelligent audio descriptions.

Built for **Eduthon 3 at King Khalid University**.

---

## Features

| User | Experience |
|------|-----------|
| **Deaf Student** | 3D avatar signs the lecture in Saudi Sign Language (SSL) in real-time, with synchronized live captions |
| **Blind Student** | AI-generated audio descriptions of slides, voice commands, full keyboard navigation |
| **Sighted Student** | Live captions, auto-generated 2-minute summaries, AI review questions at session end |
| **Lecturer** | Dashboard with mic capture, slide upload, Demo Mode, connected students panel |

- Full **Arabic (RTL)** and **English (LTR)** support, toggled with a single button
- **Claude AI** (claude-opus-4-7) for slide description, sign language rephrasing, and summarization
- **Web Speech API** for speech-to-text and text-to-speech (works without any external keys)
- **Three.js** humanoid avatar with 17+ gesture animations for sign language
- **Socket.io** real-time session system (lecturer → students streaming)
- **Demo Mode** — full demo without a microphone using a sample lecture transcript
- WCAG AA accessible — works with VoiceOver/NVDA, full keyboard navigation

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + custom design tokens |
| UI Components | Radix UI + class-variance-authority |
| Animations | Framer Motion |
| 3D Avatar | Three.js + @react-three/fiber |
| State | Zustand |
| i18n | next-intl (Arabic + English) |
| Real-time | Socket.io |
| AI | Anthropic Claude (claude-opus-4-7) |
| TTS/STT | Web Speech API (browser built-in) |

---

## Setup

### Prerequisites
- Node.js 18+
- An Anthropic API key (for AI features — the demo works without it using fallbacks)

### Steps

```bash
# 1. Clone or download the project
cd Isharah

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local and add: ANTHROPIC_API_KEY=sk-ant-...

# 4. Start the development server
npm run dev
```

Opens at **http://localhost:3000** — redirects to Arabic by default.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Optional | Enables AI slide description, sign language rephrasing, and summarization. App works without it using fallbacks. |

---

## Demo Flow

### Scenario 1: Deaf Student

1. Open `/ar/lecturer` → Click **"بدء الجلسة"** or **"بدء العرض التجريبي"** (no mic needed)
2. Copy the 6-character session code (e.g., `ABC123`)
3. Open `/ar/student/deaf` in another tab → Enter the session code
4. Watch the 3D avatar sign the lecture words with synchronized captions
5. Student can click "رفع اليد" (Raise Hand) — lecturer sees the notification

### Scenario 2: Blind Student

1. Same session setup as above
2. Open `/ar/student/blind` → Enter the session code; hear the welcome audio prompt
3. When the lecturer uploads a slide, the student hears an AI audio description automatically
4. Press **D** to describe the current slide, **R** to repeat last point, **Space** to toggle voice listening
5. All interactions work via voice commands and keyboard shortcuts — fully screen-reader compatible

### Scenario 3: Post-Lecture Summary

1. Lecturer clicks **"إنهاء الجلسة"** (End Session)
2. Sighted student view auto-generates a summary with key points and 5 AI review questions
3. Student can download the summary as a text file

### Demo Mode (No Microphone Needed)

On the Lecturer Dashboard, click **"بدء العرض التجريبي"** (Start Demo). This replays a full Arabic algorithms lecture at realistic speed, animating the avatar and populating captions for all connected students automatically — no microphone or API key required.

---

## Architecture

```
Browser (Client)
├── Landing Page          → Marketing + demo entry
├── Lecturer Dashboard    → Mic capture, slide upload, session management
│   └── Web Speech API (STT) + Claude (rephrase for sign language)
├── Deaf Student View     → Three.js avatar + live captions
├── Blind Student View    → TTS narration + voice commands + keyboard nav
└── Sighted Student View  → Captions + AI summaries + review questions

Server (server.js)
├── Next.js App Router    → All pages and API routes
├── Socket.io Server      → Real-time session events
│   ├── start_session / join_session
│   ├── transcript_update → broadcast to all students
│   ├── slide_update      → broadcast slide images
│   └── raise_hand        → notify lecturer
└── In-memory session store (Map)

Claude API Routes
├── POST /api/describe         → Vision: describe slide for blind students
├── POST /api/rephrase-for-sign → Simplify Arabic for SSL word order
└── POST /api/summarize        → Full session summary + Q&A generation
```

---

## Project Structure

```
Isharah/
├── app/[locale]/
│   ├── layout.tsx              # Locale-aware HTML root (RTL/LTR, fonts)
│   ├── page.tsx                # Landing page
│   ├── lecturer/page.tsx       # Lecturer dashboard
│   └── student/{deaf,blind,sighted}/page.tsx
├── app/api/
│   ├── describe/route.ts       # Claude Vision endpoint
│   ├── rephrase-for-sign/route.ts
│   └── summarize/route.ts
├── components/
│   ├── avatar/SignAvatar.tsx   # Three.js humanoid avatar (17+ gestures)
│   ├── captions/LiveCaptions.tsx
│   ├── language-toggle/
│   ├── nav/Navbar.tsx
│   └── ui/                    # button, card, badge, input
├── lib/
│   ├── anthropic.ts
│   ├── sign-language/gestures.ts   # Gesture definitions + word mapping
│   ├── socket-client.ts
│   ├── sample-transcript.ts        # Demo lecture data (AR + EN)
│   ├── store.ts                    # Zustand global state
│   └── utils.ts
├── messages/ar.json            # 100% Arabic translation coverage
├── messages/en.json            # 100% English translation coverage
├── public/sample-slides/       # 3 SVG lecture slides for demo
├── server.js                   # Custom server integrating Socket.io
└── .env.example
```

---

## Future Roadmap

- Integration with the official Saudi Sign Language corpus for accurate SSL translation
- WebRTC for direct video/audio streaming from lecturer
- Mobile app (React Native) for students
- Offline mode with cached gesture library
- Automatic Arabic ↔ English translation for international students
- LMS integration (Blackboard, Moodle)
- Haptic feedback API for deaf-blind students

---

Powered by **Claude AI** from Anthropic | Built for Eduthon 3 — King Khalid University
