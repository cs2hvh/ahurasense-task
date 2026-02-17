# Ahurasense (Next.js + MySQL + Prisma)

Production-style scaffold for the Ahurasense project management system inspired by Jira.

## Stack

- Next.js 15 (App Router, Server Components, Route Handlers)
- TypeScript
- Tailwind CSS 4
- Prisma ORM + MySQL
- NextAuth.js (credentials + JWT session strategy)
- React Hook Form + Zod
- TanStack Query
- Zustand
- @dnd-kit + Framer Motion

## Features Included

- Authentication foundation
  - Credentials login with NextAuth
  - Secure registration endpoint (`bcrypt` rounds = 12)
  - JWT-based sessions and middleware-protected routes
- Ahurasense dark design system
  - Exact palette tokens from spec
  - Square corner components and consistent border/shadow system
- Workspace and project management
  - Create/list workspaces
  - Create/list projects per workspace
  - Auto-provision rich workflow columns on project creation (`Backlog`, `Selected`, `In Progress`, `In Review`, `QA`, `Done`)
- Issue APIs
  - Create/list issues
  - Move issues across columns with history tracking
  - Issue types supported end-to-end (`task`, `story`, `bug`, `epic`, `subtask`)
- File/Image storage via DigitalOcean Spaces (S3-compatible)
  - Presigned upload URL generation
  - Attachment metadata persistence to DB
  - Avatar URL update endpoint
- Board UX
  - Kanban board with drag-and-drop via `@dnd-kit`
  - Add new board columns/statuses from UI
  - Create typed issues directly from a column
  - Smooth Framer Motion transitions and drag overlay
  - Optimistic board updates with server sync
- Phase 2 feature set
  - Sprints API + UI
  - Labels API + UI (project settings)
  - Issue comments/history API + issue detail page
  - Global/project search APIs
  - Notifications APIs + notifications page
- Prisma data model
  - Comprehensive schema for users/workspaces/projects/sprints/issues/comments/labels/watchers/notifications
- Testing/tooling
  - Vitest setup with sample unit tests

## API Routes (Implemented)

- `POST /api/auth/register`
- `GET /api/auth/session`
- `GET|POST /api/workspaces`
- `GET /api/workspaces/by-slug/[slug]`
- `GET|POST /api/workspaces/[workspaceId]/projects`
- `GET|POST /api/projects/[projectId]/issues`
- `PATCH /api/issues/[id]/move`
- `GET /api/projects/[projectId]/board`
- `POST|PATCH /api/projects/[projectId]/board/statuses`
- `GET|POST /api/projects/[projectId]/sprints`
- `GET|PATCH|DELETE /api/sprints/[id]`
- `POST /api/sprints/[id]/start`
- `POST /api/sprints/[id]/complete`
- `GET|POST /api/projects/[projectId]/labels`
- `PATCH|DELETE /api/labels/[id]`
- `GET|POST /api/issues/[id]/comments`
- `PATCH|DELETE /api/comments/[id]`
- `GET /api/issues/[id]/history`
- `GET /api/search`
- `GET /api/projects/[projectId]/search`
- `GET /api/users/me/notifications`
- `PATCH /api/notifications/[id]/read`
- `PATCH /api/notifications/read-all`
- `POST /api/uploads/presign`
- `POST /api/issues/[id]/attachments`
- `PATCH /api/users/me/avatar`
- `GET /api/users/me`

## App Routes (Implemented)

- `/`
- `/auth/login`
- `/auth/register`
- `/auth/forgot-password` (placeholder)
- `/auth/reset-password` (placeholder)
- `/workspaces`
- `/w/[workspaceSlug]`
- `/w/[workspaceSlug]/p/[projectKey]`
- `/w/[workspaceSlug]/p/[projectKey]/board`
- `/w/[workspaceSlug]/p/[projectKey]/backlog`
- `/w/[workspaceSlug]/p/[projectKey]/issues`
- `/w/[workspaceSlug]/p/[projectKey]/issues/[issueKey]`
- `/w/[workspaceSlug]/p/[projectKey]/sprints`
- `/w/[workspaceSlug]/p/[projectKey]/sprints/[sprintId]`
- `/w/[workspaceSlug]/p/[projectKey]/settings`
- `/profile`
- `/profile/notifications`
- `/notifications`

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Set your MySQL connection in `.env` as `DATABASE_URL`.

4. Configure DigitalOcean Spaces variables in `.env`:

```bash
SPACES_ENDPOINT="https://nyc3.digitaloceanspaces.com"
SPACES_REGION="us-east-1"
SPACES_BUCKET="your-space-name"
SPACES_ACCESS_KEY_ID="your-spaces-access-key"
SPACES_SECRET_ACCESS_KEY="your-spaces-secret-key"
SPACES_CDN_BASE_URL=""
```

5. Generate Prisma client and push schema:

```bash
npm run db:generate
npm run db:push
```

6. Seed demo data:

```bash
npm run db:seed
```

7. Run app:

```bash
npm run dev
```

## Seed Credentials

- Email: `admin@example.com`
- Password: `Admin123456!`

## Upload Flow (Spaces)

1. Request signed upload URL from `POST /api/uploads/presign`.
2. Upload the binary directly to Spaces using returned `uploadUrl`.
3. Persist attachment metadata via `POST /api/issues/[id]/attachments` or avatar via `PATCH /api/users/me/avatar`.

## Remaining Roadmap

1. Real-time collaboration (`SSE`/`WebSocket`) for board, issue comments, notifications.
2. Advanced reporting (burndown, velocity, cycle time), dashboards, and analytics.
3. Issue relationships UX (parent/child linking UI, epic timeline, dependency graph).
4. Saved filters + JQL-like parser and query presets.
5. E2E automation for auth/board/sprint critical paths and load testing.


