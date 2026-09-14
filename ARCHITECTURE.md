# QueueFlow System Architecture

## Fundamental Architectural Principle

> **"Postgres is truth.**
> **Redis is speed.**
> **Realtime is delivery.**
> **Workers are asynchronous execution.**
> **The browser is presentation."**

---

## Architectural Boundaries

### 1. Server vs. Client Boundaries
- **Server Components & Server Actions**: Execute exclusively on the server. Allowed to access secrets, environment configuration, database instances, and internal server services. Guarded with `import 'server-only'`.
- **Client Components**: Pure presentation and user interaction. Strictly prohibited from accessing service-role keys, payment secrets, Redis URLs, or direct server database credentials.
- **API Routes**: Handle external integrations and webhook ingress. Use Zod validation and `toSafeErrorResponse()` to prevent leakage of internal stack traces or raw database errors.

### 2. Supabase Client Isolation
- **Browser Client** (`@/lib/db/supabase/client`): Uses anon key + user session stored in browser cookies. Bound by Row Level Security (RLS).
- **Server Client** (`@/lib/db/supabase/server`): Uses `@supabase/ssr` with Next.js headers/cookies. Bound by RLS.
- **Admin Client** (`@/lib/db/supabase/admin`): Privileged service-role client. Protected by `server-only`. Used **strictly** for system provisioning and background worker operations. Bypasses RLS.

### 3. State & Persistence Principles
- **PostgreSQL**: Single source of truth for all durable business data (tenants, users, queues, orders, payments, audit logs).
- **Redis**: Transient cache, rate limiting, volatile queue snapshots. If Redis fails or is unconfigured, the system degrades gracefully without data loss.

### 4. Authorization Hierarchy
- `SUPER_ADMIN`: Full multi-tenant platform administration.
- `RESTAURANT_ADMIN`: Restaurant tenant owner and manager.
- `STAFF`: Restaurant floor staff / queue operators.
- `CUSTOMER`: Public unauthenticated queue joiner (no account required).

---

## Directory Layout

```
Queue Flow/
├── src/
│   ├── app/                # Next.js App Router (pages, API routes, layout)
│   ├── components/         # Reusable presentation components
│   ├── lib/
│   │   ├── auth/           # Authentication & authorization helpers
│   │   ├── config/         # Typed environment parser (Zod)
│   │   ├── db/             # Supabase client implementations
│   │   ├── errors/         # Application error hierarchy
│   │   ├── logging/        # Structured logger, redactor, correlation ID
│   │   ├── redis/          # Resilient Redis fallback client
│   │   ├── services/       # Base domain service abstractions
│   │   └── validation/     # Zod runtime validation utilities
│   ├── types/              # Centralized TypeScript declarations
│   └── middleware.ts       # Route protection & correlation ID middleware
├── supabase/
│   ├── migrations/         # PostgreSQL migration SQL files
│   └── README.md           # Database migration conventions & setup
├── tests/
│   └── unit/               # Vitest unit test suites
├── .env.example            # Safe environment template
├── next.config.ts          # Next.js security headers
├── package.json            # Dependencies & npm scripts
├── tsconfig.json           # Strict TypeScript configuration
└── vitest.config.ts        # Vitest configuration
```

---

## 5. Phase 12 Payment Architecture & Commerce Boundary

### 5.1 Decoupled State Machines
QueueFlow strictly separates domain boundaries:
- **Queue State**: `WAITING` -> `NOTIFIED` -> `CALLED` -> `SEATED` -> `COMPLETED`
- **Order Status**: `DRAFT` -> `PLACED` -> `CONFIRMED` -> `PREPARING` -> `READY` -> `SERVED`
- **Payment Status**: `PENDING` -> `PROCESSING` -> `SUCCEEDED` / `FAILED` -> `REFUND_PENDING` -> `REFUNDED`
- **Table Status**: `AVAILABLE` -> `OCCUPIED` -> `CLEANING`

`order.status` NEVER equals `PAID`. Payment state lives exclusively inside the `payments` table and `payment_events` append-only audit log.

### 5.2 Provider Abstraction & India-First Support
- Abstract `PaymentProvider` interface decouples core logic from specific gateways.
- `RazorpayProvider`: Supports INR currency, paise calculations, HMAC SHA256 signature verification for client payment completion and server webhooks.
- `ManualPaymentProvider`: Supports `CASH` and `PAY_AT_RESTAURANT` counter settlements.

### 5.3 Server-Authoritative Amounts & Idempotency
- Payable amounts are calculated dynamically from `order_items` snapshots (`sum(unit_price_snapshot * quantity)`). Client amount overrides are rejected.
- Unique `idempotency_key` guarantees duplicate requests resolve to the same payment attempt.
- `webhook_event_id` deduplicates incoming webhooks to ensure idempotency.

### 5.4 Security & RBAC / RLS
- Secret provider credentials (e.g. `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) remain strictly on the server.
- Row Level Security (RLS) and Granular RBAC (`payments.view`, `payments.create`, `payments.manage`, `payments.refund`, `payments.reconcile`) protect payment records across tenants.

---

## 6. Phase 13 Notification & Outbox Architecture

### 6.1 Transactional Outbox Pattern
To prevent distributed transaction failures during external API calls, QueueFlow implements a Transactional Outbox Pattern:
1. Domain state transitions (`QueueService`, `OrderService`, `PaymentService`) write business data AND an immutable event to `public.outbox_events` in the same database transaction.
2. HTTP requests return immediately without blocking on external SMS/Email/WhatsApp network calls.

### 6.2 Background Worker & Exponential Backoff
- `NotificationWorker` / `/api/cron/notifications` polls pending outbox events (`status IN ('PENDING', 'FAILED') AND next_attempt_at <= NOW()`).
- On processing failure, `retry_count` is incremented, and `next_attempt_at` is updated using exponential backoff: `now() + (2 ^ retry_count) * 30 seconds`.
- Outbox events transition from `PENDING` -> `PROCESSING` -> `COMPLETED` or `FAILED` (after max retries).

### 6.3 Decoupled Channel Abstraction & In-App Delivery
- Abstract `NotificationProvider` interface (`IN_APP`, `SMS`, `WHATSAPP`, `EMAIL`, `PUSH`).
- `InAppNotificationProvider` persists in-app alerts to `public.notifications`.
- `CustomerNotificationBanner` renders real-time alerts on public ticket status pages (`/q/[slug]/status/[token]`) authorized via raw queue tokens.
- `StaffNotificationBell` renders unread operational alerts on staff dashboards (`/dashboard`).



---

## 7. Queue Operating Hours & Effective Availability (Phase 2E)

Queue entry state ≠ Restaurant queue operating state ≠ Restaurant lifecycle ≠ Schedule.

- **Queue entry state** (`queue_entries.status`): `WAITING → NOTIFIED → CALLED → SEATED`, `WAITING/NOTIFIED/CALLED → CANCELLED/EXPIRED`, `CALLED → NO_SHOW`. Terminal: `SEATED/CANCELLED/NO_SHOW/EXPIRED/COMPLETED/REMOVED/SKIPPED`.
- **Restaurant lifecycle** (`restaurants.status`): `ACTIVE / SUSPENDED / ARCHIVED`. Only `ACTIVE` allows joins.
- **Queue master** (`restaurants.queue_enabled`): `false` blocks all joins regardless of operating state.
- **Manual queue state** (`restaurants.queue_operating_state`): `OPEN / PAUSED / CLOSING_SOON / CLOSED`. Staff-controlled via `set_queue_operating_state`. `OPEN/CLOSING_SOON` allow joins (CLOSING_SOON is a warning), `PAUSED/CLOSED` block. Existing entries are never mutated by state changes.
- **Schedule** (`restaurant_queue_hours`): weekly, `day_of_week 0=Sunday..6=Saturday`, `opens_at/closes_at` in restaurant-local time (`restaurants.timezone`, IANA), `is_closed` for closed days. Cross-midnight (`opens_at > closes_at`, e.g. 22:00→01:00) means open tonight + spill past midnight. `opens_at = closes_at` is invalid unless `is_closed`. Default for existing restaurants: `00:00–23:59` open every day (preserves legacy behavior).
- **FULL** is derived: `active(WAITING/NOTIFIED/CALLED) >= max_queue_capacity`. Never stored; `join_queue_atomic` enforces via `FOR UPDATE` + `COUNT`.
- **Effective joinability precedence**: lifecycle `ACTIVE` > `queue_enabled=true` > manual `PAUSED/CLOSED` block > scheduled hours > `OPEN/CLOSING_SOON` allow. Manual `PAUSED/CLOSED` always wins over schedule; schedule never reopens a paused queue.
- **Join enforcement**: `join_queue_atomic` checks all of the above in-DB (server time `timezone(tz, NOW())`, today's row + yesterday spill). Outside hours raises `QUEUE_OUTSIDE_OPERATING_HOURS`. Customer sees "Queue is currently closed" + "Opens at 6:00 PM" via `getNextQueueOpening` (7-day scan, null if none).
- **Next opening**: `QueueScheduleService.getNextOpening` (read-only, same-day → next-day → closed days → cross-midnight aware).
- **Health**: outside scheduled hours → `CLOSED`; manual `PAUSED` → `PAUSED`; manual `CLOSED` → `CLOSED`. Priority: lifecycle/disabled `CLOSED` > manual `PAUSED` > manual `CLOSED` > scheduled `CLOSED` > `CRITICAL` > `BUSY` > `EMPTY` > `HEALTHY`.
- **No auto-scheduler**: `evaluateAvailability`/`getNextQueueOpening` exist, but automatic background opening/closing is NOT active until the Production Reliability stage. Schedule evaluation is read-only; join path uses authoritative DB check.
