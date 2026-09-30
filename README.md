# Zone — Your Learning Twin. A Smarter You.

An offline-first, AI-powered learning companion that builds a **digital twin** of every student: a live mathematical model of what they understand, how well they retain it, and where their knowledge gaps are. Every practice session, response latency, and review feeds back into the model, which drives an adaptive tutor, a personalised learning path, and real-time teacher insights.

> **Learn. Adapt. Grow. Never Forget.**

Built for the **YUVA MEGATHON 2026**.

---

## The Problem

Traditional learning platforms show a score and move on. Students don't know *what* they've actually understood or when they're about to forget it, and teachers only see problems after an exam has already gone wrong.

## The Idea

Zone closes the loop between learning and measurement:

1. **Assess** — practice quizzes and tutor interactions produce evidence per concept.
2. **Model** — the twin updates mastery, confidence, uncertainty and forgetting risk for every concept.
3. **Adapt** — the tutor, learning path and revision schedule reshape themselves around the gaps.
4. **Retain** — Ebbinghaus-style spaced retention schedules reviews right before a concept fades.
5. **Intervene** — teachers see class-wide twins and gaps live, and act before students fall behind.

---

## Features

### Student Portal
| Module | What it does |
|---|---|
| **Dashboard** | Snapshot of mastery, momentum and what to do next |
| **My Learning Twin** | Overview, Knowledge, Behavior, Retention and Goals views of your cognitive model |
| **Knowledge Graph** | Concept map showing how topics connect and where you're strong or weak |
| **Knowledge Gaps** | Prioritised weak concepts detected from your assessments |
| **AI Tutor** | Adaptive tutor that explains concepts based on your current mastery |
| **Learning Path** | Personalised sequence of concepts to study next |
| **Assessments** | Practice quizzes that feed the twin |
| **Retention & Revision** | Spaced-repetition schedule driven by predicted retention |
| **Progress & Analytics** | Trends in mastery, streaks and study behaviour |
| **Learning Goals** | Milestone tracking aligned to target outcomes |
| **Messages & Notifications** | Direct chat with teachers and alerts |
| **AI Assistant** | Ask questions about your own learning data |

### Teacher Portal
| Module | What it does |
|---|---|
| **Teacher Dashboard** | Class-level overview at a glance |
| **Classrooms** | Create and manage classes and enrolments |
| **Class Learning Twins** | Aggregate and per-student twin models |
| **Student Insights** | Individual strengths, weaknesses and behaviour |
| **Knowledge Gap Analytics** | Topics where the class struggles most |
| **Intervention Center** | Flag at-risk students and act on them |
| **Teacher Analytics** | Performance trends across classes |
| **Parent Reports** | Shareable progress reports |
| **Cloud Backup** | Sync and back up learning data |
| **AI Assistant** | Ask about classes, at-risk students and gaps |

### Platform
- **Offline-first** — the tutor and quiz model run locally; no external AI API key required.
- **Role-based access** — separate Student and Teacher experiences.
- **Authentication** — email/password and **Continue with Google** (via Clerk).
- **Single deployable** — one Node process serves both the API and the built frontend.

---

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide icons
- **Backend:** Node.js, Express (TypeScript)
- **Auth:** Email/password sessions + Clerk (Google OAuth)

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Clerk](https://dashboard.clerk.com) application with **Google** enabled as a social connection (only needed for Google sign-in)

### 1. Install
```bash
npm install
```

### 2. Configure environment
Create a `.env` file in the project root:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxx
PORT=3000
```

| Variable | Purpose |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (frontend) |
| `CLERK_SECRET_KEY` | Clerk secret key (server-side token verification) |
| `PORT` | Server port (defaults to `3000`) |

No AI API key is needed — the tutor and quiz model run locally.

### 3. Run in development
```bash
npm run dev
```
Open <http://localhost:3000>.

---

## Build & Deploy

```bash
npm run build   # build the frontend
npm start       # serve the built frontend + API from one process
```

The server reads `PORT` from the environment, so it deploys as a single Node web service on platforms like **Render** or **Railway**. Set `VITE_CLERK_PUBLISHABLE_KEY` at build time and `CLERK_SECRET_KEY` at runtime.

> Use Clerk **production** keys and add your deployed domain in the Clerk dashboard before going live.

---

## How Google Sign-In Works

1. The user clicks **Continue with Google** and completes OAuth through Clerk.
2. The frontend sends the Clerk session token to `POST /api/auth/clerk`.
3. The server verifies the token with Clerk, finds or creates the matching Zone account (new users start as Students), and issues a normal Zone session.

---

## Roadmap

- Password reset flow
- Richer intervention automation for teachers
- Expanded concept library and knowledge graphs per subject

---

## License

Add a license of your choice (e.g. MIT) before publishing.