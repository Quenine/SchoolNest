# Communication Model

Step 5 communication is in-app announcements only. No SMS, email, WhatsApp or push delivery is attempted or recorded. Announcements support draft, scheduled, published and archived states; normal, important and urgent priority; optional pinning and expiry; and school, role, class or arm audiences.

Scheduled announcements become visible at query time when `publish_at <= now()`. Effective visibility also requires non-archived status and a future/no expiry. Role targets resolve user roles. Class and arm targets resolve explicit teacher assignments or guardian-linked active enrollments. Reads are idempotent per announcement/profile and are described as “In-app reads,” never delivery.

## Multi-target and audience semantics

School scope cannot be mixed with narrower targets. Role and class scopes require one or more deduplicated targets; arm targets carry their parent class and are validated tenant-side. Teachers may target only active assigned classes/arms. Supported role targets exclude platform roles.

�Estimated eligible audience� deduplicates qualifying profile IDs across targets. �In-app reads� counts read rows. �Estimated unread� is the non-negative difference; none of these metrics claims external delivery. Recipient feeds exclude announcements before schedule time and after expiry/archive, while management history retains them.

## Step 5 closure migration order

`database/schema.sql` is the canonical fresh-database schema and contains the final Step 5 state. For an existing database where Step 5.1 already succeeded, do not rerun or edit Step 5.1. Apply and validate in this order:

1. Run `database/migrations/step-5-2-step5-closure.sql`.
2. Run the read-only `database/verification/step-5-verification.sql`.
3. Redeploy the application.
4. Complete two-school, role, schedule, expiry, lock, and viewport acceptance checks.

Step 5.2 changes the attendance save RPC to return JSONB, preserves the applied Step 5.1 history, installs operation-specific RLS and least-privilege grants, and keeps attendance table mutation RPC-only. No Results & Grading work is included.