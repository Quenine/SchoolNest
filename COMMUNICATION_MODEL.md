# Communication Model

Step 5 communication is in-app announcements only. No SMS, email, WhatsApp or push delivery is attempted or recorded. Announcements support draft, scheduled, published and archived states; normal, important and urgent priority; optional pinning and expiry; and school, role, class or arm audiences.

Scheduled announcements become visible at query time when `publish_at <= now()`. Effective visibility also requires non-archived status and a future/no expiry. Role targets resolve user roles. Class and arm targets resolve explicit teacher assignments or guardian-linked active enrollments. Reads are idempotent per announcement/profile and are described as â€œIn-app reads,â€ never delivery.

## Multi-target and audience semantics

School scope cannot be mixed with narrower targets. Role and class scopes require one or more deduplicated targets; arm targets carry their parent class and are validated tenant-side. Teachers may target only active assigned classes/arms. Supported role targets exclude platform roles.

“Estimated eligible audience” deduplicates qualifying profile IDs across targets. “In-app reads” counts read rows. “Estimated unread” is the non-negative difference; none of these metrics claims external delivery. Recipient feeds exclude announcements before schedule time and after expiry/archive, while management history retains them.
