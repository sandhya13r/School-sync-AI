
# SchoolSync AI

**Your school. One intelligent operating system.**
*Digitize the paperwork. Automate the schedule. Get alerted before small problems become crises.*

SchoolSync AI is a single-page, role-based school operations platform built for a
hackathon submission. It runs entirely client-side — no backend server or database
required — with every "AI" feature backed by real, deterministic logic running over a
seeded, internally-consistent demo school (not placeholder UI or fake buttons).

---
# Vercel App (Live demo Link)

[School Sync – Live Demo](https://school-sync-26z8k7c2h-sandhya13rs-projects.vercel.app)


## Table of contents

- [Demo accounts](#demo-accounts)
- [Feature overview](#feature-overview)
- [How the "AI" actually works](#how-the-ai-actually-works)
- [Demo dataset](#demo-dataset)
- [File structure](#file-structure)
- [Tech stack](#tech-stack)
- [Run it locally](#run-it-locally)
- [Build for production](#build-for-production)
- [Push this project to GitHub](#push-this-project-to-github)
- [Deploy it](#deploy-it-optional)
- [Data persistence](#data-persistence)
- [Scope & roadmap alignment](#scope--roadmap-alignment)
- [Known limitations](#known-limitations)

---

## Demo accounts

All demo accounts use the password `demo123`. On the sign-in screen, click into the
email field to see them listed in an autocomplete dropdown, or type the address manually.

| Role    | Email                | What you see                                   |
|---------|-----------------------|-------------------------------------------------|
| Admin   | admin@schoolos.ai     | Full command center — every module              |
| Teacher | teacher@schoolos.ai   | Today's schedule, attendance, marks entry       |
| Student | student@schoolos.ai   | Own timetable and marks                         |
| Parent  | parent@schoolos.ai    | Their child's attendance, fees, and marks       |

## Feature overview

### Admin Command Center (Dashboard)
The landing screen after admin login. Answers "what needs my attention right now?" rather
than just showing static counts:
- **Stat tiles** — student/teacher counts, today's attendance %, fees pending, documents
  pending, AI-flagged at-risk students.
- **Priority alert feed** — a live, computed list of issues (timetable conflicts, teacher
  leave needing a substitute, pending document verification, overdue fees, low attendance,
  unassigned complaints), each tagged Critical/High/Medium/Low and clickable through to the
  relevant module.
- **AI insight card** — a one-line rollup of at-risk students with a link into Analytics.
- **Attendance trend chart** — school-wide attendance across the week (Recharts line chart).

### Smart Timetable + Conflict Solver
A real constraint-based scheduler, not a static grid:
- Generates a full weekly timetable for every class from scratch, respecting teacher
  subject-qualification, per-teacher weekly workload caps, and lab-room capacity for
  Computer Science periods.
- Two conflicts are deliberately seeded in on load (one teacher double-booking, one lab
  double-booking) to demonstrate the detection flow — chosen so they never accidentally
  cause a *third*, unintended conflict.
- **Regenerate conflict-free** — reruns the generator from scratch with zero conflicts.
- **Resolve** (per conflict) — reassigns just the affected slot to a free, qualified
  teacher or an open lab, without touching the rest of the schedule.
- Per-class grid view (Mon–Fri × 6 periods) with conflicting cells visually flagged.

### Substitute Teacher AI
When a teacher is marked on leave, the system:
1. Scans the timetable for every period they were due to teach that day.
2. For each period, finds candidate teachers who are subject-qualified **and** free at
   that exact slot.
3. Ranks candidates by today's current workload (lighter load ranks higher) and gives a
   bonus if the candidate already teaches that same class elsewhere.
4. Shows the reasoning inline (e.g. "Mathematics-qualified · Free during Period 4 ·
   Workload today: 2 periods · Already teaches 8B").
5. On approval: updates the live timetable for that day, logs an audit entry, and pushes
   a notification.

### AI Document Reader
Simulates the full document-intelligence pipeline end to end:
`Upload → OCR → Field extraction → Confidence scoring → Human review → Approve/Reject → Database update`
- Supports Admission Forms, Transfer Certificates, and Fee Receipts, each with realistic
  extracted fields.
- Every field carries a **confidence score**; anything under 70% is flagged for manual
  verification with an inline warning.
- Fields are editable before approval.
- Approving an **Admission Form** creates a real new student record in the app — visible
  immediately in Students and Analytics.
- Runs in clearly-labeled **Demo AI mode** (no external model key is configured) using a
  deterministic local template pool, per the "must never crash without an API key" rule
  from the original spec.

### AI Performance Analytics
- Class-average bar chart (Term 3) across all 8 classes.
- **At-risk detection**: flags any student whose score dropped 10+ points between Term 2
  and Term 3 in any subject, or whose attendance is below 75% — with the specific reason
  stated per student (e.g. "Mathematics performance declined 20% between Term 2 and
  Term 3", "Attendance is at 68%, below the 75% threshold").

### AI Admin Assistant
A natural-language chat that answers from the app's live seeded data (not a generic
LLM response) by matching intent and querying the in-memory dataset:
- "Which classrooms are free tomorrow?"
- "Which students have attendance below 75%?"
- "How much fee is pending?"
- "Which teachers are absent today?"
- "Which classes have timetable conflicts?"
- "Which documents are pending verification?"
- "Who can substitute for [subject]?"
- "Which students currently need immediate attention and why?"

Each answer shows which data sources it drew from (e.g. `Students`, `Attendance`) as
small chips underneath, and suggestion chips are provided to try it instantly.

### AI Question Paper Generator
Pick a subject and chapter, and it assembles a paper from a structured local question
bank — MCQ / short-answer / long-answer sections with marks weighting — and offers a
print/export view.

### Complaints + AI Triage
Submit a free-text complaint and it's automatically categorized (Academic, Infrastructure,
Transport, Fees, Safety, Staff, Technology, Other) and prioritized via keyword-rule
matching, then queued for admin resolution.

### Student & Teacher Management
Searchable, filterable directories with detail views — a student drawer shows attendance,
fee status, guardian info, and a per-subject average chart; the teacher table shows
weekly/today workload and live leave status.

### Attendance & Marks
Teachers pick a class, then either mark daily attendance (present/absent toggle per
student) or enter Term 3 scores per subject — both write straight back into the shared
dataset, so Analytics and the Dashboard reflect changes immediately.

### Role-based portals
- **Admin** — every module above.
- **Teacher** — today's schedule, attendance & marks entry, timetable, question papers,
  AI assistant.
- **Student** — own timetable and marks.
- **Parent** — their child's attendance, fee status, and marks (read-only, scoped to one
  student — no access to other students' data).

### Light / dark mode
A full second color theme (not an inverted filter) — separate palette tuned for dark
backgrounds, toggled from the top bar (or the sign-in screen), persisted across sessions.

## How the "AI" actually works

There's no external LLM call in this build (no API key is wired up), so every "AI"
feature is implemented as **real, explainable, deterministic logic** running over the
seeded dataset — matching the spec's requirement that AI features must have a working
demo/fallback mode and must never be a fake button:

| Feature                  | Real algorithm                                                        |
|---------------------------|------------------------------------------------------------------------|
| Timetable generation      | Greedy constraint solver respecting teacher qualification, workload caps, and lab capacity |
| Conflict detection        | Full scan of the timetable for teacher/room double-bookings           |
| Substitute recommendation | Filters by qualification + availability, ranks by workload + class familiarity |
| At-risk student detection | Rule-based: term-over-term score decline ≥10pts, or attendance <75%   |
| Document extraction       | Deterministic template pool with per-field confidence scores (labeled "Demo AI mode") |
| Complaint triage          | Keyword-matching rule set mapped to category + priority               |
| Admin assistant           | Intent-matching against the question text, then live queries against the in-memory dataset |
| Question paper generation | Structured local question bank per subject/chapter                    |

Swapping in a real model later (e.g. for the document reader or assistant) would mean
replacing these functions' internals — the UI, data flow, and review/approval steps
around them wouldn't need to change.

## Demo dataset

Deliberately scaled down from a real school (1,200+ students) to a size that's fully
internally consistent and hand-verifiable — every number ties back to the same
underlying data:

- **120 students** across **8 classes** (6A/6B, 7A/7B, 8A/8B, 9A/9B), 15 students each
- **15 teachers** across **8 subjects**: Mathematics, Science, English, Social Studies,
  Hindi, Computer Science, Physical Education, Art
- **2 shared labs** (Lab 1, Lab 2) for Computer Science periods
- **5-day week × 6 periods/day** timetable per class
- 3 terms of marks per student per subject, with a subset intentionally showing decline
  (for at-risk detection) and a subset with low attendance
- A subset of students seeded with pending/overdue fee status
- One teacher seeded on leave today (drives the substitute recommender)
- Two seeded timetable conflicts (drives the conflict solver)
- 3 sample pending documents, 3 sample complaints

## File structure
```
schoolsync-ai/
├── index.html Vite entry HTML
├── package.json Dependencies + npm scripts
├── vite.config.js Vite/React plugin config
├── .gitignore
├── README.md This file
└── src/
├── main.jsx Mounts <App /> into #root
└── App.jsx The application (identical content to SchoolSyncAI.jsx)
```
### Internal layout of `App.jsx` / `SchoolSyncAI.jsx`
The whole app is one file, organized top-to-bottom into clearly marked sections:

| Section                      | Contents                                                              |
|-------------------------------|--------------------------------------------------------------------|
| `window.storage` polyfill     | localStorage-backed fallback so persistence works outside Claude.ai |
| **Design tokens**             | The `CSS` string — light/dark CSS variables, layout, component styles |
| **Seed data**                 | Days/periods/subjects/classes, `buildTeachers()`, `buildStudents()`, `generateTimetable()`, `detectConflicts()`, `resolveConflict()`, `recommendSubstitute()`, document templates, question bank, complaint seed + `triage()` |
| **App context**                | React Context (`Ctx`/`useApp`), `buildInitialState()`, `DEMO_USERS` |
| **Small primitives**           | `Badge`, `StatCard`, `Avatar`, `EmptyState`, `ConfBar`, `ThemeToggle` |
| **Shell**                      | `Sidebar`, `Topbar` (role-aware nav config in `NAV`) |
| **Login**                      | Sign-in screen with the demo-account autocomplete dropdown |
| **Root / ShellRoot**            | Top-level state, persistence effects, theme handling, routing |
| **Admin Dashboard**             | `buildAlerts()`, `atRiskStudents()`, `AdminDashboard` |
| **Students / Teachers**         | Directory + detail views |
| **Attendance & Marks**          | `AttendancePage` |
| **Timetable**                   | `TimetablePage` |
| **Substitutes**                 | `SubstitutesPage` |
| **Documents**                   | `DocumentsPage` (AI Document Reader) |
| **Analytics**                   | `AnalyticsPage` |
| **Complaints**                  | `ComplaintsPage` |
| **Question Paper Generator**     | `QuestionPaperPage` |
| **AI Assistant**                 | `answerQuestion()`, `AssistantPage` |
| **Teacher / Family views**       | `TeacherDashboard`, `FamilyDashboard`, `FamilyMarks` |

## Tech stack

- **React 18** (function components + hooks, no external state library — plain
  `useState`/`useContext`)
- **Vite** for local dev/build tooling
- **Recharts** for the bar/line charts
- **lucide-react** for icons
- Hand-written CSS (CSS custom properties for theming) — no Tailwind/UI kit dependency
- `window.storage` (Claude.ai artifact API) with a `localStorage` polyfill for standalone use

No backend, no database, no build-time environment variables required.

## Run it locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview   # optional: preview the production build locally
```

The build output goes to `dist/`.

## Push this project to GitHub

From inside this project folder:

```bash
git init
git add .
git commit -m "Initial commit — SchoolSync AI"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## Scope & roadmap alignment

This build implements the **"Round 2 — Must Build + Strong Differentiators"** feature set:

- ✅ AI Document Reader
- ✅ Smart Timetable + Conflict Solver
- ✅ Student & Teacher Management
- ✅ Attendance & Marks
- ✅ Proactive Admin Dashboard
- ✅ Role-based login (Admin / Teacher / Student / Parent)
- ✅ AI Admin Assistant (natural-language queries)
- ✅ AI Performance Analytics
- ✅ AI Question Paper Generator
- ✅ Substitute Teacher Recommender

Deliberately **out of scope** (matching the roadmap's own "Priority 3 / Bonus & Future"
list): Library, Transport, Inventory, Maintenance, full Fees module, Audit Logs, Global
Search, multi-school SaaS, computer-vision attendance, and CCTV safety analytics.

## Known limitations

- No real backend or database — all state lives in the browser (see
  [Data persistence](#data-persistence)).
- No external AI provider is wired up; document extraction, the assistant, and question
  generation run on local deterministic logic rather than a live model call (this is
  intentional and clearly labeled in the UI as "Demo AI mode" — see
  [How the "AI" actually works](#how-the-ai-actually-works)).
- The dataset is a scaled-down demo school (120 students, 15 teachers) rather than a
  full-size roster, chosen so every number in the dashboard stays internally consistent
  and easy to verify.
- A handful of timetable slots per class may be left unfilled by the generator (read as
  free periods) when workload caps are tight — this doesn't affect conflict detection or
  the substitute recommender.
