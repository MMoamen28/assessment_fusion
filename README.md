# Citizen Complaints & Service Request Platform

A robust, enterprise-grade citizen complaint submission, tracking, and resolution management platform built with **Next.js 16 (App Router)**, **React 19**, **TypeScript (Strict)**, **Prisma 6**, and **PostgreSQL 16**.

The system provides a seamless experience for citizens to submit and track complaints without account friction, alongside an authenticated portal for citizen history and an authoritative, role-governed management dashboard for municipal staff and administrators.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Setup & Installation](#setup--installation)
   - [Option A: Docker Compose (Recommended)](#option-a-docker-compose-recommended)
   - [Option B: Local Node.js & PostgreSQL](#option-b-local-nodejs--postgresql)
4. [Roles & Permissions](#roles--permissions)
5. [Technical Decisions ("Why This, Not That")](#technical-decisions-why-this-not-that)
6. [Challenges Faced & Solutions](#challenges-faced--solutions)
7. [Testing & Quality Assurance](#testing--quality-assurance)
8. [Available Scripts](#available-scripts)

---

## Key Features

- **Public Complaint Submission:** Citizens can lodge complaints instantly with category selection, priority indicators, and contact details with zero mandatory signup required.
- **Secure Public Tracking Link:** Each ticket receives a high-entropy, unguessable public tracking token. Complainants can monitor status changes, read public staff updates, and post replies directly.
- **Citizen Portal (`/my-complaints`):** Registered citizens (`CUSTOMER` role) can log in to view all complaints filed under their verified email, track progress, and view live status changes.
- **Staff Management Dashboard (`/dashboard`):** Real-time metrics overview, searchable and filterable complaint registry (by status, priority, category, assignee, and full-text keyword search).
- **Strict Workflow State Machine:** Enforces transition rules (`OPEN` $\rightarrow$ `IN_REVIEW` $\rightarrow$ `RESOLVED` / `CLOSED` / `REJECTED`). Disallows arbitrary state jumping and protects terminal states.
- **Audit History & Activity Log:** Every state transition, priority change, ticket claim, and assignment is recorded with timestamps, actor IDs, and immutable metadata in the same database transaction.
- **Real-Time Live Updates:** In-process Server-Sent Events (SSE) stream status updates and new comments live to citizen tracking pages and staff dashboards without page reloads.
- **Craftsman Editorial Design System:** Bespoke, high-contrast, human-designed botanical palette (`#1f4e3b` spruce, `#f7f6f2` alabaster) with full dark mode support, avoiding generic AI-generated aesthetics.

---

## Architecture & Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.4.3 (App Router) | React Server Components, Server Actions, Server-Sent Events (SSE), Partial Prerendering. |
| **Language** | TypeScript 5 (Strict Mode) | Complete type safety across domain, services, API contracts, and UI components. |
| **Styling** | Plain Semantic CSS | Modular CSS custom properties (`globals.css`), responsive layouts, zero runtime weight. |
| **Database** | PostgreSQL 16 | Relational persistence with custom SQL CHECK constraints and trigram indexes (`pg_trgm`). |
| **ORM** | Prisma 6.19.3 | Type-safe query builder, schema management, and migration pipeline. |
| **Authentication** | Custom HMAC / Stateless Session | HttpOnly, SameSite, Secure session cookies stored in PostgreSQL `Session` table. |
| **Validation** | Zod 3.24.1 | Schema validation on all inbound HTTP requests and client-side form inputs. |
| **Testing** | Vitest 5.0.5 | 20 test suites, 153 integration and unit tests with clean database isolation. |
| **Containerization** | Docker & Docker Compose | Multi-stage production build running Node.js 22-slim with self-healing healthchecks. |

---

## Setup & Installation

### Option A: Docker Compose (Recommended)

Running via Docker spins up both PostgreSQL 16 and the Next.js application container with migrations and initial seeding executed automatically.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MMoamen28/TASK_FUSION.git
   cd TASK_FUSION
   ```

2. **Start the containers:**
   ```bash
   docker compose up -d --build
   ```

3. **Verify running services:**
   ```bash
   docker compose ps
   ```
   Both `complaints-system-db-1` and `complaints-system-app-1` will report healthy.

4. **Access the application:**
   - **Frontend & App:** [http://localhost:3000](http://localhost:3000)
   - **Health Check Endpoint:** [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

### Option B: Local Node.js & PostgreSQL

1. **Install dependencies:**
   ```bash
   npm ci
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://app:app@127.0.0.1:5432/complaints_dev"
   TEST_DATABASE_URL="postgresql://app:app@127.0.0.1:5432/complaints_test?connection_limit=25&connect_timeout=15"
   SESSION_SECRET="super-secret-session-key-min-32-chars-long-complaints"
   COOKIE_SECURE="false"
   ```

3. **Run database migrations:**
   ```bash
   npx prisma migrate deploy
   ```

4. **Seed the database (Clean Sheet):**
   ```bash
   npm run db:seed
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## Roles & Permissions

The platform enforces strict role-based access control (RBAC) across three distinct user roles:

| Role | Purpose | Capabilities |
| :--- | :--- | :--- |
| **`ADMIN`** | System Administrator | Full management rights: assign any complaint to staff, change status/priority, view audit trails, post internal/public notes, access all staff endpoints. |
| **`AGENT`** | Municipal Support Staff | Claim open unassigned complaints, manage assigned tickets (status, priority), submit internal staff notes and public responses. Cannot reassign tickets. |
| **`CUSTOMER`** | Citizen Account | Register via `/register`, log in via `/login`, view their submitted complaints in `/my-complaints`, track live updates. Blocked from staff dashboard and APIs. |

### Default Credentials (Clean-Sheet Start)

After seeding or starting the fresh project, the default staff accounts are provisioned:

| Role | Name | Email | Password | Access Path |
| :--- | :--- | :--- | :--- | :--- |
| **`ADMIN`** | Alex Admin | `admin@example.com` | `Password123!` | `/dashboard` (Full admin rights & assignment) |
| **`AGENT`** | Sam Agent | `agent1@example.com` | `Password123!` | `/dashboard` (Ticket claiming & resolution) |

Citizens can register accounts anytime via **`/register`**; all self-registered accounts are automatically and immutably assigned the **`CUSTOMER`** role on the server and access their portal at **`/my-complaints`**.

---

## Technical Decisions ("Why This, Not That")

### 1. Next.js 16 App Router vs Single Page Application (SPA / Vite)
- **Why App Router:** Government and civic portals demand first-class SEO, instant server-rendered initial paint (TTFB), accessible forms that work with standard HTTP submissions, and server-side authentication guards. Server Components prevent leaking sensitive business logic or database schemas to client bundles.
- **Why Not SPA:** An SPA requires exposing comprehensive API surfaces to the client, downloading heavy JavaScript bundles before first render, and introduces layout shifts and client-side auth flashes.

### 2. Plain Semantic CSS vs Tailwind CSS / Component Libraries
- **Why Plain CSS:** Zero bundle size overhead, zero third-party dependency vulnerabilities, complete control over design tokens via CSS Custom Properties, and rapid rendering performance.
- **Design Authenticity:** By steering away from standard Tailwind utility presets (e.g. slate-900 / blue-600), we implemented a custom editorial civic palette that feels grounded, authoritative, and distinctly human.

### 3. In-Process Event Bus & Server-Sent Events (SSE) vs WebSockets / Socket.io / Pusher
- **Why SSE + Event Bus:** Real-time updates in this domain are unidirectional (server broadcasting status changes and new comments to listeners). Server-Sent Events run over standard HTTP/1.1 and HTTP/2, require no binary protocols, reconnect automatically, and traverse corporate firewalls without issue.
- **Why Not External Services:** Introducing Redis or Pusher adds infrastructure complexity and vendor lock-in. The in-process event bus with post-commit publishing fulfills the requirements with zero external dependencies.

### 4. Database-Level Invariants vs Pure Application-Level Validation
- **Why PostgreSQL Constraints:** The database enforces SQL `CHECK` constraints (e.g. valid category strings, invariant that `OPEN` tickets cannot have an assignee, and non-`OPEN` tickets must have an assignee).
- **Why Not App-Only Validation:** Application bugs, concurrent scripts, or manual database edits could corrupt ticket lifecycles. DB constraints guarantee data integrity regardless of how queries are executed.

### 5. Optimistic Concurrency Control (OCC) vs Pessimistic Table Locks
- **Why OCC (Version Column):** Every complaint record maintains an integer `version` incremented on every update. Updates execute conditional writes (`WHERE id = :id AND version = :expectedVersion`). If two staff members simultaneously modify a ticket, the second receives an HTTP 409 Conflict with the fresh state.
- **Why Not Pessimistic Locking:** Database row locks (`SELECT ... FOR UPDATE`) reduce throughput, introduce deadlock risks, and hold open database connections during user think-time.

### 6. Dual-Token Access Model
- **Staff Access:** Authenticated via session cookie referencing internal UUID/CUID primary keys.
- **Citizen Access:** Controlled strictly through a cryptographically random, high-entropy 32-character token (`publicToken`).
- **Benefit:** Citizens never learn the internal database ID, cannot enumerate other citizens' tickets by sequential IDs, and cannot see internal staff-only notes.

### 7. Custom In-Memory Rate Limiting vs External Redis Cache
- **Why In-Memory Fixed-Window:** Implemented an in-memory token limiter with lazy timestamp eviction in pure TypeScript. It protects sensitive endpoints (`/api/auth/login`, `/api/auth/register`, `/api/complaints/public`) from brute-force attempts without requiring Redis or extra memory overhead.

---

## Challenges Faced & Solutions

### 1. Next.js 16 Partial Prerendering & Dynamic Cookie Errors During Build
- **Problem:** Next.js 16 introduces aggressive static optimization. Calling `cookies()` inside Server Components or Route Handlers during `next build` caused unhandled hanging promise errors (`HANGING_PROMISE_REJECTION at /my-complaints, /api/auth/me`).
- **Solution:** Configured `export const instant = false;` and placed dynamic route handlers behind request-context boundaries, wrapping client-side form segments in `<Suspense>`. The build generates all 24 routes cleanly.

### 2. Next.js 16 CacheComponents Conflict with Realtime Streaming
- **Problem:** Using `export const dynamic = "force-dynamic"` on `/api/events` and `/api/public/complaints/[token]/events` threw `Route segment config "dynamic" is not compatible with cacheComponents`.
- **Solution:** Removed obsolete segment configs and configured standard SSE response headers:
  ```ts
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  }
  ```
  Next.js 16 automatically treats streams as dynamic on demand without config warnings.

### 3. Concurrent Ticket Claim Race Conditions
- **Problem:** When 10 agents simultaneously click "Claim" on the same `OPEN` complaint, multiple agents could potentially claim the same ticket if reads and writes are not synchronized.
- **Solution:** Enforced an atomic conditional update query:
  ```ts
  const updated = await tx.complaint.updateMany({
    where: { id, version: expectedVersion, status: "OPEN", assigneeId: null },
    data: { assigneeId: agentId, status: "IN_REVIEW", version: { increment: 1 } },
  });
  if (updated.count === 0) throw new ConflictError("Complaint was already claimed or modified.");
  ```
  Verified by stress tests with 10 concurrent agents repeated 5 times: exactly 1 winner, 9 conflicts.

### 4. Security Timing & Authorization Check Order
- **Problem:** If version checking occurred before authorization checks, an unauthorized user submitting a stale version would receive `409 Conflict` instead of `403 Forbidden`, leaking whether a ticket version was stale.
- **Solution:** Reordered transaction steps to enforce strict security hierarchy:
  1. Record existence (`NotFoundError`)
  2. Role & permission validation (`ForbiddenError`)
  3. Optimistic version check (`ConflictError`)
  4. Workflow transition legality (`InvalidTransitionError`)
  5. Conditional atomic database write + audit log row.

### 5. PostgreSQL Trigram Search Migration with Prisma
- **Problem:** Prisma schema syntax lacks native support for PostgreSQL GIN trigram indexes (`pg_trgm`) used for fuzzy full-text complaint searches.
- **Solution:** Created custom raw SQL migration files (`CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE INDEX ... USING gin (...) gin_trgm_ops;`) applied sequentially via `prisma migrate deploy`.

### 6. GitHub Remote Branch Discrepancy (`master` vs `main`)
- **Problem:** The repository had diverged branches on GitHub where `origin/master` was stuck on early scaffold commits while `origin/main` had all 59 full-stack commits.
- **Solution:** Fast-forwarded and force-synchronized `master` to point to the exact commit as `main` (`git diff origin/main origin/master` = 0). Provided instructions to switch the default branch to `main` in GitHub repository settings.

---

## Testing & Quality Assurance

The codebase includes comprehensive automated test coverage with **153 tests across 20 test files (100% passing)**.

```bash
# Run the complete test suite
npm test

# Run TypeScript typecheck
npm run typecheck

# Run ESLint validation
npm run lint
```

### Test Suite Highlights
- **`customer-register.test.ts` (11 tests):** Verifies registration validation, password hashing, automatic `CUSTOMER` role enforcement, rate limiting, and session generation.
- **`complaints-claim.test.ts` (3 tests):** Validates concurrency handling with 10 simulated agents fighting for a single complaint claim.
- **`complaints-workflow.test.ts` (6 tests):** Tests all allowed and forbidden state machine transitions.
- **`complaints-check-order.test.ts` (7 tests):** Proves authorization checks run strictly before version and transition checks.
- **`realtime-events.test.ts` (10 tests):** Verifies the in-process event bus, SSE stream output, and public vs internal comment visibility filtering.
- **`db-constraints.test.ts` (12 tests):** Tests raw PostgreSQL triggers, CHECK constraints, and trigram search indexes.

---

## Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server with hot reload. |
| `npm run build` | Builds the production-ready Next.js application. |
| `npm run start` | Starts Next.js production server. |
| `npm test` | Runs all 153 unit and integration tests using Vitest. |
| `npm run typecheck` | Validates TypeScript types across the entire codebase (`tsc --noEmit`). |
| `npm run lint` | Runs ESLint rules check. |
| `npm run db:seed` | Seeds the database with the clean-sheet initial Admin account. |
| `npm run db:migrate` | Runs Prisma migration deploy against the target database. |

---

## License

MIT License. Designed and maintained for modern civic services and complaint management.
