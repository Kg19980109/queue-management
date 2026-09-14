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

---

## 8. Production Outbox Worker + Scheduled Queue Maintenance (Phase 3A)

### 8.1 Worker Architecture
`Postgres transaction → outbox_events → scheduled worker → claim → process → notification/provider → mark delivered OR retry`.

- **Claiming**: `claim_outbox_events(p_limit)` atomically `UPDATE … SET status='PROCESSING' … FOR UPDATE SKIP LOCKED … RETURNING`, bounded batch (default 50, max 100). Two workers never receive the same event.
- **Lease/recovery**: `PROCESSING` rows untouched for 30+ min are stale; `recover_stale_outbox_events()` moves them to `PENDING` (retry+1, exponential backoff) or terminal `FAILED` at max retries. Lease column is `updated_at` (no new columns needed).
- **Retry**: `(2 ^ retry_count) * 30s`, capped at 1 hour. Terminal `FAILED` preserves `last_error`, never deletes the event.
- **Idempotency**: every dispatched notification carries `idempotencyKey = outbox event id`; `notifications.idempotency_key` has a unique partial index; providers check-then-insert and treat `23505` conflicts as success. Re-encountering an event never duplicates internal state.

### 8.2 Cron Routes & Auth
- `GET/POST /api/cron/notifications?limit=50` — `NotificationWorker.runBatch(limit)`.
- `GET/POST /api/cron/queue-maintenance?limit=50` — `QueueService.expireOverdueCalledEntries(limit)` only. No `restaurant_id` parameter accepted (400); scope is internal across all restaurants.
- Both share `authenticateCronRequest` (`src/lib/cron-auth.ts`): `Authorization: Bearer <CRON_SECRET>` only (never query string), constant-time compare, 401 on invalid, 503 when `CRON_SECRET` unset. No stack traces to callers.
- Scheduling is FREE via `pg_cron` inside Postgres (no Vercel cron — removed for cost):
  - `queue-maintenance-every-minute` calls `expire_overdue_called_queue_entries(50)` directly in-DB every minute (no HTTP, no secret). See `20260922000000_phase3a_pg_cron.sql`.
  - `notifications-every-minute` triggers `POST /api/cron/notifications` via `pg_net` (needs `APP_URL` + `CRON_SECRET`, one-time manual setup SQL in the same migration file).
- Each invocation starts, processes a bounded batch, finishes, returns. No in-memory locks, no `setInterval`, no filesystem state — Postgres coordinates. The API routes remain for manual runs and pg_net triggers.

### 8.3 Automatic No-Show Is Now ACTIVE
`expire_overdue_called_queue_entries(p_limit)` (server `NOW()`, `CALLED` + `called_at + call_timeout_minutes` elapsed only) transitions to `NO_SHOW` with `no_show_reason='CUSTOMER_DID_NOT_RESPOND'`, server `no_show_at`, plus `queue_events` + `outbox_events` atomically, `SKIP LOCKED` concurrent-safe, idempotent re-runs. It does NOT create a second outbox event in the route — the RPC already does. `WAITING/NOTIFIED/SEATED/terminal` rows are never touched.

### 8.4 Provider Behavior
`IN_APP` persists `DELIVERED`; all other channels (`SMS/WHATSAPP/EMAIL/PUSH`) use the console mock (`SENT`) until real credentials are configured — the worker never pretends external delivery happened, failures are recorded and retried per policy.

### 8.5 Observability
Each cron run logs `correlationId`, worker name, start/end, batch size, processed/succeeded/failed, duration (and `expiredCount` for maintenance) via the structured logger with redaction. No tokens, phones, message contents, or auth headers are logged.

## 9. Staff Invitation + Secure Onboarding (Phase 3C)

### 9.1 Invitation model (Supabase Auth owns the credential)
- `RestaurantAdminService.createStaff()` sends a Supabase Auth invitation via
  `admin.inviteUserByEmail(email, { data: { role, restaurant_id }, redirectTo })`
  — no custom tokens, no emailed passwords, no custom password hashing.
- Membership is created with status `INVITED` (+ `invited_at`). It is NEVER
  `ACTIVE` at invite time. Migration `20260923000000_phase3c_staff_invitation.sql`
  adds the `INVITED` state and `invited_at` / `invitation_accepted_at` columns
  (idempotent; replaces any prior status CHECK).
- Grantable roles are exactly `STAFF` and `RESTAURANT_ADMIN`
  (`INVITABLE_STAFF_ROLES`). `SUPER_ADMIN` is rejected by schema validation
  plus an explicit server guard — a restaurant admin can never escalate to
  platform privileges, and the assigned membership role always equals the
  requested role (no silent downgrade/upgrade).
- Duplicate handling: ACTIVE member of the same restaurant+role -> controlled
  duplicate error; existing Auth user new to the restaurant -> INVITED
  membership + fresh invite; existing INVITED -> resend path; errors never
  reveal whether an arbitrary email exists in Auth.

### 9.2 Acceptance flow (the ONLY INVITED -> ACTIVE path)
- Invite email links land on `/auth/confirm?next=/auth/accept-invitation`
  (must be allowlisted in Supabase Auth "Redirect URLs"; `APPLICATION_URL`
  supplies the host). The callback exchanges PKCE `code` or verifies
  `token_hash`+`type`, then redirects ONLY to allowlisted internal paths
  (`resolveSafeRedirect`; attacker `?next=` falls back to onboarding).
- `/auth/accept-invitation` requires a live invitation session; otherwise it
  shows expired/invalid guidance. The employee sets a password via the
  browser Supabase client (`updateUser`) — the password never touches app
  APIs, logs, or storage.
- `acceptInvitationForUser(userId)` (server session is the sole input)
  activates ONLY the user's own INVITED memberships scoped to the Auth
  `user_metadata.restaurant_id` when present; sets `invitation_accepted_at`;
  writes `STAFF_INVITATION_ACCEPTED` audit per membership. Repeat acceptance
  is idempotent (`alreadyActive` + dashboard path, no duplicates).
- The admin "Activate" button is NOT shown for INVITED rows (admin activation
  of an unaccepted invitation is rejected server-side). INVITED rows offer
  "Resend Invitation" (same Auth user + membership, fresh Supabase invite,
  refreshed `invited_at`, `STAFF_INVITATION_RESENT` audit) and "Cancel"
  (INVITED -> INACTIVE, `STAFF_INVITATION_CANCELLED` audit).

### 9.3 Rate limiting & consistency
- Create: `rl:staff:invite:<restaurantId>:<actorId>`, 20/hour.
  Resend: `rl:staff:resend:<membershipId>`, 6/hour.
  (`RateLimitEndpointClass.AUTHENTICATED_ADMIN`; customer QR limits never apply.)
- Auth + Postgres are not one transaction: order is authorize -> invite ->
  persist membership -> audit. Membership upsert on
  `(user_id, restaurant_id, role)` plus invite-reuse make retry deterministic;
  partial failure returns an explicit retry-safe error, never a duplicate.
