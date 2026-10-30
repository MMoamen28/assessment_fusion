# Complaints & Case Management System

A complaints and case management system built with **Next.js (App Router)**, **TypeScript**, **Node.js**, **PostgreSQL**, and **Prisma**.

Citizens register an account to submit complaints and follow them in their own portal. Each complaint also has a public tracking page that can be viewed without signing in. Staff manage complaints through a role-based dashboard with a controlled status workflow, comments, and an audit history.

## Features

- **Citizen accounts:** citizens register at `/register` and sign in to submit complaints. Name and email on the form come from the account.
- **Citizen portal (`/my-complaints`):** citizens see their complaints and can open one to view its timeline and reply.
- **Public tracking page:** each complaint has its own page at an unguessable link. Anyone with the link can view its current status and public updates without signing in.
- **Staff dashboard (`/dashboard`):** complaint list with search and filters (status, priority, category, assignee, keyword).
- **Controlled workflow:** `OPEN` → `IN_REVIEW` → `RESOLVED` / `CLOSED` / `REJECTED`. Invalid transitions are rejected.
- **Claim and assignment:** agents claim unassigned complaints. Admins assign complaints to any staff member.
- **Comments:** public replies and internal staff-only notes.
- **Audit history:** status changes, priority changes, claims, and assignments are recorded with actor and timestamp.
- **Real-time updates (bonus):** Server-Sent Events push status changes and new comments to open pages.
- **Docker setup (bonus):** one command starts the database and the app.

## Setup

### Option A: Docker Compose (recommended)

Starts PostgreSQL and the app. Migrations and seed data run automatically.

```bash
git clone https://github.com/MMoamen28/assessment_fusion.git
cd assessment_fusion
docker compose up -d --build
```

Open <http://localhost:3000>.

### Option B: Local Node.js and PostgreSQL

Requires Node.js 22 and PostgreSQL 16.

```bash
npm ci
```

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://app:app@127.0.0.1:5432/complaints_dev"
TEST_DATABASE_URL="postgresql://app:app@127.0.0.1:5432/complaints_test?connection_limit=25&connect_timeout=15"
SESSION_SECRET="replace-with-a-random-string-of-at-least-32-characters"
COOKIE_SECURE="false"
```

Then:

```bash
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### Seeded accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| `ADMIN` | `admin@example.com` | `Password123!` |
| `AGENT` | `agent1@example.com` | `Password123!` |

Citizens can register at `/register`. Self-registered accounts always get the `CUSTOMER` role, assigned on the server.

## Roles

| Role | Capabilities |
| :--- | :--- |
| `ADMIN` | Assign complaints, change status and priority, view audit history, post public replies and internal notes. |
| `AGENT` | Claim unassigned complaints, update status and priority on assigned complaints, post replies and internal notes. Cannot reassign. |
| `CUSTOMER` | Submit complaints, view and reply on their own complaints. No access to staff pages or APIs. |

## Main Technical Decisions

- **Claiming a complaint:** the claim is one database update that only works if the complaint is still `OPEN` and unassigned. If two agents click at the same time, one succeeds and the other gets an error (`409`).
- **Preventing overwrites:** each complaint has a `version` number that goes up with every change. If someone edits an outdated copy, the update is rejected instead of overwriting the newer change.
- **Workflow rules:** the allowed status changes are defined in one place and used everywhere, so invalid jumps (for example `OPEN` straight to `RESOLVED`) are rejected.
- **Security order:** the server checks that the user is allowed to act before it checks anything else about the complaint.
- **Database rules:** PostgreSQL constraints back up the app's rules (for example, an `OPEN` complaint cannot have an assignee).
- **Public page:** each complaint has a long random link token instead of its ID, so other complaints cannot be guessed. Internal notes are never shown there.
- **Accounts:** citizens need an account to submit, so every complaint belongs to a known user.
- **Audit history:** every important change is saved together with the change itself, so the history always matches the data.
- **Real-time updates:** Server-Sent Events push updates to open pages. They only go from server to browser, so they are simpler than WebSockets.
- **Prisma:** used for queries and migrations, with one raw SQL migration for the search indexes.
- **Validation:** all requests are validated with Zod, and errors return clear HTTP status codes.

## Testing

```bash
npm test
```

153 tests across 20 files, run against a separate test database. The business-rule tests are:

- `complaints-claim.test.ts`: ten agents claim the same complaint at once; exactly one succeeds.
- `complaints-workflow.test.ts`: allowed and forbidden status transitions.
- `complaints-check-order.test.ts`: authorization is checked before version and transition checks.
- `db-constraints.test.ts`: database constraints and search indexes.

## Known Limitations

- The event bus and rate limiter are in-process, so they suit a single app instance. Several instances would need a shared service such as Redis.
- There is no password reset or email verification.

## AI Tools Used

I used **Claude (Anthropic)** as a planning and guidance partner. It helped me break the project into steps, explained what to build and why at each stage, and I used it to check the finished project against the assessment requirements and to review this README. The technical decisions above were my choices, and I tested the result.
