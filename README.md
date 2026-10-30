# Complaints & Case Management System

A complaints and case management system built with **Next.js (App Router)**, **TypeScript**, **Node.js**, **PostgreSQL**, and **Prisma**.

Citizens can submit complaints without an account and follow them through a public tracking page. Authenticated staff manage complaints through a role-based dashboard with a controlled status workflow, comments, and a full audit history.

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Setup Instructions](#setup-instructions)
4. [Roles and Permissions](#roles-and-permissions)
5. [Main Technical Decisions](#main-technical-decisions)
6. [Testing](#testing)
7. [Known Limitations](#known-limitations)
8. [AI Tools Used](#ai-tools-used)
9. [Available Scripts](#available-scripts)

---

## Features

- **Public complaint submission:** anyone can submit a complaint with a category, priority, and contact details. No sign-up is required.
- **Public tracking page:** each complaint has its own page at an unguessable link. It shows the current status and public updates, and the complainant can reply, all without signing in.
- **Citizen portal (`/my-complaints`):** registered citizens (`CUSTOMER` role) can see the complaints filed under their email.
- **Staff dashboard (`/dashboard`):** summary metrics plus a complaint list with search and filters (status, priority, category, assignee, keyword).
- **Controlled workflow:** status changes follow a fixed set of allowed transitions (`OPEN` → `IN_REVIEW` → `RESOLVED` / `CLOSED` / `REJECTED`). Invalid jumps are rejected.
- **Claim and assignment:** agents can claim unassigned complaints. Admins can assign complaints to any staff member.
- **Comments:** public replies visible to the complainant, and internal notes visible to staff only.
- **Audit history:** status changes, priority changes, claims, and assignments are recorded with the actor, timestamp, and details, in the same transaction as the change itself.
- **Real-time updates (bonus):** Server-Sent Events push status changes and new comments to open tracking pages and dashboards.
- **Docker setup (bonus):** one command starts the database and the application.

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript (strict mode) |
| Runtime | Node.js 22 |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Validation | Zod |
| Authentication | Cookie-based sessions stored in PostgreSQL |
| Testing | Vitest |
| Containers | Docker and Docker Compose |

## Setup Instructions

### Option A: Docker Compose (recommended)

Starts PostgreSQL and the application. Migrations and seed data are applied automatically.

```bash
git clone https://github.com/MMoamen28/assessment_fusion.git
cd assessment_fusion
docker compose up -d --build
```

Check that both services are healthy:

```bash
docker compose ps
```

The application is available at <http://localhost:3000>. A health check endpoint is at <http://localhost:3000/api/health>.

### Option B: Local Node.js and PostgreSQL

**Prerequisites:** Node.js 22 and a running PostgreSQL 16 instance.

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create a `.env` file in the project root:

   ```env
   DATABASE_URL="postgresql://app:app@127.0.0.1:5432/complaints_dev"
   TEST_DATABASE_URL="postgresql://app:app@127.0.0.1:5432/complaints_test?connection_limit=25&connect_timeout=15"
   SESSION_SECRET="replace-with-a-random-string-of-at-least-32-characters"
   COOKIE_SECURE="false"
   ```

3. Apply the database migrations:

   ```bash
   npx prisma migrate deploy
   ```

4. Seed the database:

   ```bash
   npm run db:seed
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

The application is available at <http://localhost:3000>.

### Seeded accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| `ADMIN` | `admin@example.com` | `Password123!` |
| `AGENT` | `agent1@example.com` | `Password123!` |

These credentials are for local evaluation only. Citizens can create their own accounts at `/register`. Self-registered accounts always receive the `CUSTOMER` role, assigned on the server.

## Roles and Permissions

| Role | Capabilities |
| :--- | :--- |
| `ADMIN` | Full management access: assign complaints to staff, change status and priority, view audit history, post public replies and internal notes. |
| `AGENT` | Claim unassigned complaints, update status and priority on their assigned complaints, post public replies and internal notes. Cannot reassign complaints. |
| `CUSTOMER` | View their own complaints at `/my-complaints`. No access to the staff dashboard or staff APIs. |

Anyone with a complaint's public link can view its public details without signing in.

## Main Technical Decisions

**1. Atomic claim to prevent double assignment.**
Claiming is a single conditional update: `UPDATE ... WHERE id = ? AND status = 'OPEN' AND assigneeId IS NULL`. If two agents claim at the same moment, the database lets only one update succeed. The other sees zero affected rows and receives a `409 Conflict`. This avoids explicit locks and does not depend on application-side timing. The concurrent test confirms exactly one winner out of ten simultaneous attempts.

**2. Optimistic concurrency with a version column.**
Every complaint has an integer `version`, incremented on each update. Updates must include the version the client last saw. If someone else changed the complaint in the meantime, the update is rejected with `409` instead of silently overwriting their change. This was preferred over `SELECT ... FOR UPDATE`, which would hold connections open while users think.

**3. Workflow rules in one place, checked in a fixed order.**
Allowed transitions are defined in a single state machine. For every update, checks run in this order: record exists → caller is authorized → version matches → transition is valid → write. Authorization runs before the version check so an unauthorized user cannot learn anything about a complaint's state from the error they receive.

**4. Database constraints as a second line of defense.**
Besides application validation, PostgreSQL `CHECK` constraints enforce key invariants, for example that an `OPEN` complaint has no assignee and a non-`OPEN` complaint has one. A bug or a manual edit cannot leave a complaint in an impossible state.

**5. Separate public token for public access.**
The public page uses a random 32-character token, not the internal ID. Citizens cannot guess or enumerate other complaints, and the public endpoints never return internal notes.

**6. Prisma with hand-written SQL where needed.**
Prisma provides type-safe queries and migrations. For search, a raw SQL migration adds PostgreSQL trigram (`pg_trgm`) indexes, which Prisma's schema does not support natively.

**7. Server-Sent Events for real-time updates.**
Updates only flow from server to client, so SSE is simpler than WebSockets: plain HTTP, automatic reconnection, and no extra infrastructure. Events are published only after the database transaction commits, so clients never see changes that were rolled back.

**8. Audit log written in the same transaction.**
Each important change writes its audit entry inside the same transaction as the change. The history cannot disagree with the data.

**9. Input validation and error handling.**
All incoming requests are validated with Zod. Domain errors map to consistent HTTP responses: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `422`/`400` invalid transition. Public submission and authentication endpoints are rate limited.

## Testing

```bash
npm test            # run the full test suite
npm run typecheck   # TypeScript type check
npm run lint        # ESLint
```

The suite has 153 tests across 20 files, run against a separate test database. Areas most relevant to the business rules:

| Test file | Covers |
| :--- | :--- |
| `complaints-claim.test.ts` | Concurrent claim: ten agents claim the same complaint, exactly one succeeds. |
| `complaints-workflow.test.ts` | Allowed and forbidden status transitions. |
| `complaints-check-order.test.ts` | Authorization is checked before version and transition checks. |
| `customer-register.test.ts` | Registration validation, password hashing, forced `CUSTOMER` role, rate limiting. |
| `realtime-events.test.ts` | Event publishing, SSE output, public vs. internal comment filtering. |
| `db-constraints.test.ts` | Database `CHECK` constraints and trigram search indexes. |

## Known Limitations

- **Single-instance real-time and rate limiting.** The event bus and rate limiter are in-process, which is enough for one application instance. Running several instances would require a shared service such as Redis.
- **Basic authentication.** There is no password reset or email verification flow, since these were outside the scope of the brief.
- **Simple interface.** The UI is functional and consistent rather than polished, as the brief allows.

## AI Tools Used

I used AI tools during this assessment.

- **Claude (Anthropic):** used as a planning and guidance partner. It helped me break the project into steps and explained what to build, how, and why at each stage. I also used it to check the finished project against the assessment requirements and to review this README.
- **Antigravity (AI coding agent):** used to implement the steps I planned, including project setup, the Prisma schema, migrations and seed data, and parts of the frontend such as the complaint detail page and its actions.

The technical decisions described above were my choices, and I reviewed the generated code, ran the test suite, and fixed issues as they came up.

## Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start the development server. |
| `npm run build` | Build for production. |
| `npm run start` | Start the production server. |
| `npm test` | Run all tests with Vitest. |
| `npm run typecheck` | Type-check the codebase (`tsc --noEmit`). |
| `npm run lint` | Run ESLint. |
| `npm run db:seed` | Seed the database with the admin and agent accounts. |
| `npm run db:migrate` | Apply Prisma migrations to the target database. |