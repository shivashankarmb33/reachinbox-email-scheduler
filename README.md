# ReachInbox – Full-Stack Distributed Email Job Scheduler

A production-minded, fault-tolerant email scheduling platform built with **Node.js, Express, TypeScript, BullMQ, Redis, PostgreSQL (Prisma ORM), Elasticsearch, and React**.

The system reliably schedules, batches, and dispatches thousands of emails with per-sender concurrency control, atomic Redis rate limiting, persistent state recovery across restarts, Slack alert webhooks, and full-text Elasticsearch search.

---

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React + Vite + Tailwind)"]
        UI["Dashboard & Compose Modal (PapaParse CSV)"]
    end

    subgraph API["Backend API (Express + TypeScript)"]
        Auth["Google OAuth 2.0 (Passport)"]
        SlackAuth["Slack OAuth 2.0"]
        Controller["Email Scheduler Controller"]
        Prisma["Prisma ORM"]
        Outbox["Transactional Outbox"]
    end

    subgraph Infrastructure["Infrastructure & Storage"]
        PG[("PostgreSQL 16")]
        RedisStore[("Redis 7 (AOF Persistent)")]
        ES[("Elasticsearch 8.13")]
    end

    subgraph Queues["Distributed Queue (BullMQ)"]
        EmailQ["reachinbox-email-queue"]
        IndexQ["reachinbox-indexing-queue"]
    end

    subgraph Workers["BullMQ Email Worker (Concurrency: 5)"]
        Processor["Job Processor"]
        Limiter["Redis Lua Atomic Rate Limiter\n(Hourly & Min Delay)"]
        SmtpService["Nodemailer (Ethereal SMTP)"]
        SlackNotifier["Slack API (chat.postMessage)"]
    end

    UI -->|Schedule Batch / CSV| Controller
    Controller -->|Bulk Insert| PG
    Controller -->|Record Outbox| PG
    Controller -->|Delayed Enqueue| EmailQ
    EmailQ --> RedisStore
    
    EmailQ -->|Dispatch Job| Processor
    Processor -->|Atomic State Transition| PG
    Processor -->|Check / Reserve Slot| Limiter
    Limiter <-->|Atomic Lua Eval| RedisStore
    
    Processor -->|Hourly Limit Exceeded| SlackNotifier
    SlackNotifier -->|chat.postMessage| SlackWebhook["Slack Channel"]
    
    Processor -->|Send Mail| SmtpService
    SmtpService -->|250 OK / Preview URL| Ethereal["Ethereal SMTP Server"]
    
    Processor -->|Update Status & MessageId| PG
    Processor -->|Index Document| ES
```

---

## Main Features

1. **Google OAuth 2.0 Authentication**: Real OAuth authentication via Passport.js with secure HTTP-only cookies and Redis session storage.
2. **CSV Bulk Recipient Parsing**: Upload CSV/TXT recipient lists with PapaParse client-side deduplication, syntax validation, invalid email counters, and interactive preview pills.
3. **BullMQ Delayed Scheduling**: Individual queue jobs with stable job IDs (`jobId = emailId`) backed by Redis AOF persistence. No cron or node-cron dependencies.
4. **Configurable Worker Concurrency**: Concurrency-safe workers (default: `WORKER_CONCURRENCY=5`) executing jobs in parallel.
5. **Per-Sender Minimum Sending Delays**: Configurable delay (default: `2000ms`) enforced atomically using Redis timestamps to guarantee intervals between consecutive emails from the same sender.
6. **Redis-Backed Hourly Rate Limiting**: Per-sender atomic hourly limit (default: `50/hour`) using Redis Lua scripts. Excess emails are rescheduled to the beginning of the next hourly window without job loss.
7. **Real Slack OAuth & Rate Limit Alerting**: When a sender hits their hourly limit, a Slack alert is posted via `chat.postMessage` detailing the sender email, limit, count, and remaining rescheduled emails (with a 1-hour anti-spam cooldown).
8. **Ethereal SMTP Integration**: Nodemailer transporter generating test accounts and inspectable web preview URLs (`https://ethereal.email/messages`).
9. **Elasticsearch Full-Text Search**: Indexed emails across `recipient`, `subject`, `body`, and `status`, with user-scoped isolation, pagination, and database fallback.
10. **Bull Board Queue Dashboard**: Live queue monitoring UI mounted at `/admin/queues`.
11. **Restart Persistence & Startup Reconciliation**: Recovers any interrupted `PROCESSING` or un-enqueued `SCHEDULED` emails from PostgreSQL upon server startup.

---

## Monorepo Folder Structure

```text
reachinbox-email-scheduler/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── infrastructure/
│   └── docker-compose.yml       # PostgreSQL 16, Redis 7 (AOF), Elasticsearch 8
├── backend/
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma        # User, Sender, Email, EmailBatch, SlackConnection, OutboxEvent
│   ├── src/
│   │   ├── app.ts               # Express configuration, Helmet, CORS, Sessions
│   │   ├── server.ts            # Entrypoint, DB checks, startup reconciliation
│   │   ├── bullboard/           # Bull Board dashboard router (/admin/queues)
│   │   ├── config/              # env (Zod), prisma, redis
│   │   ├── middleware/          # centralized errorHandler, requireAuth
│   │   ├── modules/
│   │   │   ├── auth/            # Google OAuth Passport strategy & routes
│   │   │   ├── email/           # Nodemailer Ethereal service, validation, controller
│   │   │   ├── scheduler/       # Redis Lua rate limiter & min delay
│   │   │   ├── senders/         # Multi-sender management
│   │   │   ├── slack/           # Slack OAuth, token encryption & chat.postMessage
│   │   │   └── search/          # Elasticsearch client & search service
│   │   ├── queues/              # BullMQ email queue and indexing queue
│   │   ├── services/            # Startup reconciliation service
│   │   ├── utils/               # Pino logger, AES-256-GCM crypto
│   │   └── workers/             # BullMQ Email Worker
│   └── tests/                   # Vitest unit and integration test suites
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── src/
    │   ├── App.tsx              # React Router & ProtectedRoute
    │   ├── main.tsx
    │   ├── context/AuthContext  # Session auth context & login handlers
    │   ├── components/
    │   │   ├── common/          # Pagination
    │   │   ├── dashboard/       # StatsCards (Total, Scheduled, Sent, Failed)
    │   │   ├── email/           # ComposeModal (CSV parser), ScheduledTable, SentTable
    │   │   └── layout/          # Navbar (user profile, Slack status, Bull Board link)
    │   ├── pages/               # LoginPage, DashboardPage
    │   ├── services/api.ts      # Axios client with credentials
    │   └── types/               # TypeScript interfaces
```

---

## Prerequisites

- **Node.js**: v18.0.0 or v20+
- **npm**: v9+
- **Docker Desktop** (or native PostgreSQL, Redis, and Elasticsearch)

---

## Setup & Installation

### 1. Clone & Install Dependencies

```bash
git clone <repo-url>
cd reachinbox-email-scheduler

# Install root, backend, and frontend dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Configure Environment Variables

Create `.env` files based on `.env.example`:

```bash
cp .env.example backend/.env
```

Ensure the following default values are present in `backend/.env`:

```ini
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reachinbox_email_scheduler?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=50
SESSION_SECRET=reachinbox_super_secret_session_key_min_32_chars
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
ELASTICSEARCH_URL=http://localhost:9200
```

### 3. Start Infrastructure via Docker Compose

```bash
# Spins up PostgreSQL, Redis (AOF enabled), and Elasticsearch with health checks
docker compose -f infrastructure/docker-compose.yml up -d
```

Verify services:
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **Elasticsearch**: `http://localhost:9200`

### 4. Run Prisma Migrations

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Start the Application

In separate terminal sessions:

```bash
# Terminal 1: Backend API & Worker
cd backend
npm run dev

# Terminal 2 (Optional standalone worker):
cd backend
npm run dev:worker

# Terminal 3: Frontend Development Server
cd frontend
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## Rate Limiting & Concurrency Architecture

### Per-Sender Minimum Sending Delay
- **Default**: `2000ms` (`MIN_DELAY_BETWEEN_EMAILS`).
- **Mechanism**: Distributed Redis key `ratelimit:sender:{senderId}:last_sent_ts`. When any worker picks up an email for sender $S$, it atomically verifies the elapsed time since the last email sent by $S$. If less than 2000ms has elapsed, the job is rescheduled in BullMQ for the remaining delta. Ordinary `setTimeout` is never used.

### Per-Sender Hourly Limit
- **Default**: `50 emails/hour` (`MAX_EMAILS_PER_HOUR_PER_SENDER`).
- **Mechanism**: Atomic Redis Lua script increments counter `ratelimit:sender:{senderId}:hour:{YYYYMMDDHH}` with 2-hour TTL.
- **Rescheduling**: When the limit is reached, the worker calculates the exact milliseconds until the next UTC hour (`calculateMsUntilNextHour()`), reschedules the excess job into the next hour via BullMQ delayed jobs, and triggers a real Slack notification via `chat.postMessage`.
- **Reconciliation**: If an SMTP transmission fails with a transient network error, `refundHourlySlot()` decrements the counter so failed attempts do not consume quota.

---

## Idempotency & SMTP Delivery Limitations

- **Atomic Transitions**: Emails transition from `SCHEDULED` to `PROCESSING` via `prisma.email.updateMany({ where: { id: emailId, status: 'SCHEDULED' }, data: { status: 'PROCESSING' } })`. If `count === 0`, concurrent workers automatically skip the job.
- **Stable Job Identifiers**: BullMQ `jobId` equals database `email.id`.
- **SMTP Guarantee Limitation**: Standard SMTP does not support two-phase distributed commits. If a process terminates after the SMTP server transmits `250 OK` acknowledgment but before PostgreSQL commits the `SENT` status, duplicate delivery is possible if blindly retried. To prevent this, the worker stores the `providerMessageId` and records explicit delivery failure reasons rather than blindly retrying unconfirmed dispatches.

---

## Running Automated Tests

Run the test suite via Vitest:

```bash
cd backend
npm run test
```

Verified test coverage:
- `tests/validation.test.ts`: Recipient validation, UUID checks, non-negative delays.
- `tests/crypto.test.ts`: AES-256-GCM token encryption and tampering rejection.
- `tests/rateLimiter.test.ts`: Hourly window and next-hour millisecond calculation.
- `tests/health.test.ts`: Express API health endpoints.
- `tests/ethereal.test.ts`: Live Ethereal SMTP test email dispatch and preview URL extraction.

---

## Live Endpoints

- **Frontend**:https://reachinbox-frontend-1ri7.onrender.com
- **Backend API**:https://reachinbox-backend-5635.onrender.com
- **API Health**: https://reachinbox-backend-5635.onrender.com/health?utm_source=chatgpt.com
- **Bull Board**: https://reachinbox-backend-5635.onrender.com/admin/queues?utm_source=chatgpt.com

