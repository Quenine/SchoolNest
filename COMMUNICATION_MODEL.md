# Communication Model

Step 5 communication is in-app announcements only. No SMS, email, WhatsApp or push delivery is attempted or recorded. Announcements support draft, scheduled, published and archived states; normal, important and urgent priority; optional pinning and expiry; and school, role, class or arm audiences.

Scheduled announcements become visible at query time when `publish_at <= now()`. Effective visibility also requires non-archived status and a future/no expiry. Role targets resolve user roles. Class and arm targets resolve explicit teacher assignments or guardian-linked active enrollments. Reads are idempotent per announcement/profile and are described as “In-app reads,” never delivery.
