# Employee Daily Task Tracker — Frontend

A modern, responsive Single Page Application built with **React 19**, **TypeScript**, **Vite**, **Redux Toolkit**, and **Tailwind CSS v4**.

---

## Workspace Separation & Features

### 1. Employee Workspace
- **Dashboard**: Localized calendar view, pending tasks, recent daily update summaries, and quick action shortcuts.
- **Daily Tracker**: Daily log form with interactive task progress sliders, hours allocation, and workflow fields:
  - *Completed Work*
  - *Next Work Plan*
  - *Blockers*
- **Tasks**: Filterable task table with task status and dynamic due-date indicators (`Overdue`, `Due Today`, `Due Soon`, `On Track`).
- **Global Search**: *Intentionally removed* from the Employee header to keep employee workspace distraction-free and role-appropriate.

### 2. Director Workspace
- **Dashboard & Team View**: Department-wide visibility into team workloads and task progress.
- **Reviews**: Pending and reviewed daily updates submitted by subordinates with approval/changes-requested workflows.
- **Global Search**: Enabled in header with quick navigation to team member profiles, subordinate tasks, and daily review details.

### 3. Admin Workspace
- **Administration Panels**: Full CRUD for Users, Departments, Roles, and immutable system Audit Logs.
- **Global Search**: Enabled in header with quick navigation strictly scoped to Admin views (`/admin/users`, `/admin/departments`, `/admin/roles`, `/admin/audit-logs`) and never leaking Director-only views.

---

## Shared Utilities & Architectural Patterns

- **`src/utils/date.ts`**: Local calendar date preservation (`getLocalDate()`, `formatDate()`, `formatDateTime()`, `formatHours()`) preventing negative/positive UTC timezone day-shift bugs.
- **`src/utils/taskStatus.ts`**: Bi-directional status and progress consistency calculators (`computeStatusFromProgress`, `computeProgressFromStatus`, `getDueDateIndicator`).
- **`src/utils/errorHandling.ts`**: Safe TypeScript error handling utilities extracting meaningful user-facing messages from unknown catches.
- **Notification Freshness**: Lightweight 45-second polling alongside instant action-triggered event bus (`'notification-refresh'`) on update submissions, reviews, and comments.

---

## Scripts & Development

### Prerequisites
- Node.js 20+
- npm 10+

### Commands

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```
   Server starts at [http://localhost:5173](http://localhost:5173). Requests to `/api` are proxied to the backend at `http://127.0.0.1:8000`.

3. **Run automated frontend tests (Vitest + Testing Library)**:
   ```bash
   npm test
   ```

4. **Build production bundle (TypeScript type-check + Vite build)**:
   ```bash
   npm run build
   ```

5. **Preview production build locally**:
   ```bash
   npm run preview
   ```
