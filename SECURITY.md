# Security Notes

## Tenant Isolation

Every school-owned record must be scoped by `school_id`. App queries should always filter by the authenticated user's tenant context, and database RLS policies enforce tenant boundaries as a second line of defense.

## Role Access

Dashboard routes are protected server-side. Role routing is:

- `platform_super_admin`: platform dashboard
- `school_owner`, `principal`, `head_teacher`, `school_admin`: school admin dashboard
- `bursar`: bursar finance dashboard
- `teacher`, `class_teacher`: teacher dashboard
- `parent`: parent portal
- `exam_officer`: exam officer dashboard

School admins manage setup/core records. Bursars and school admins manage finance. Parents only read linked-child finance records.

## RLS Model

The reconciliation migration adds foundation RLS helpers and policies:

- `current_auth_user_id()`
- `is_platform_super_admin()`
- `is_school_member(target_school_id uuid)`
- `has_school_role(target_school_id uuid, allowed_roles text[])`
- `is_guardian_of_student(target_school_id uuid, target_student_id uuid)`

Step 3 and Step 4 tables already include tenant-scoped policies. Foundation policies are supplied in `database/migrations/step-2-foundation-reconciliation.sql`.

## Service Role Handling

`SUPABASE_SERVICE_ROLE_KEY` is read only in server-only code. The admin client imports `server-only` and must never be imported by client components. It is used for school registration bootstrap where Auth user creation and tenant setup must happen atomically from trusted server code.

## Audit Logs

Sensitive actions should write audit events with school id, actor user id, action, entity type, entity id, and safe metadata. Do not log passwords, tokens, payment secrets, or private credentials.

## Child And Student Data Privacy

Student, guardian, and parent finance data is private. Parents may only read records for linked children. Teachers do not receive finance visibility by default.

## Finance Data Protection

Manual payment and receipt records are tenant-scoped and role-scoped. Online payment integration is not implemented yet; when added, provider secrets must remain server-only and payment callbacks must be verified.

## CSV imports
Import jobs must derive school identity from authenticated context, require school-admin authorization, retain RLS, reject non-CSV/oversized input and unexpected columns, and omit secrets and medical data from audit metadata.

The Import Centre permits only authenticated setup administrators, derives tenant identity server-side, revalidates the uploaded file at confirmation, and relies on RLS for import history and errors. Limits are 2 MB and 2,000 rows. Unexpected columns and cross-school references are rejected.
