# Foundation Audit

## Already Present

- Next.js App Router project structure and dashboard routes.
- Supabase browser, server, and admin client files.
- Base multi-tenant tables: schools, branches, sessions, terms, profiles, roles, subscriptions, feature flags, overrides, and audit logs.
- Step 3 school setup/core records and Step 4 finance tables, actions, pages, and helpers.
- Seed file for roles, feature flags, and subscription plans, including Free tier limits.

## Missing Or Incomplete

- Register-school and login forms were placeholders.
- Logout action was missing.
- Admin Supabase client did not explicitly import `server-only`.
- Dashboard protection was authentication-based but not consistently route-role checked.
- Foundation-table RLS was not implemented in the original schema block; Step 3 and Step 4 had RLS, but the foundation still needed reconciliation.
- Tenant/auth helper names requested by Step 2 were missing, though some equivalent logic existed.

## Fixed

- Added real register-school server action that creates auth user, school, owner profile, owner role, Free subscription, profile settings, and audit log.
- Added real login server action and role-based redirects.
- Added logout server action.
- Added route-level role layouts for school admin, bursar, parent, teacher, exam officer, and platform super admin sections.
- Added helper modules for current user, require-user, require-role, tenant context, live feature checks, and audit logging wrapper.
- Added `server-only` to the admin Supabase client.
- Added `database/migrations/step-2-foundation-reconciliation.sql` for foundation RLS helpers, foundation RLS policies, and additive school metadata columns.

## Manual Supabase Configuration Still Needed

- Set Site URL and redirect URLs in Supabase Auth for localhost and production.
- Decide whether email confirmation is required before first login.
- Run schema, seed, then the reconciliation migration in the correct order.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in server-side environment variables.
- Configure storage buckets and policies later before enabling uploads.

## Known Limitations

- Registration cleanup deletes the newly created auth user and school if setup fails after auth creation, but live operators should still inspect Supabase logs for partial failures.
- The app does not yet include invite flows for staff/parents.
- Feature gating helper exists; not every UI branch is yet fully feature-gated.
- Online payments remain intentionally disabled until a later premium Paystack step.

## Manual Test Checklist

- Register a school with owner details and confirm it creates a Free workspace.
- Log out and log back in as the owner.
- Confirm owner redirects to `/dashboard/school-admin`.
- Confirm bursar, parent, teacher, exam officer, and platform roles redirect to their expected dashboards.
- Try opening a dashboard outside the signed-in role and confirm it redirects to `/dashboard`.
- Create a student/staff/class up to Free limits and verify quota messages.
- Create fee categories/items/invoices/payments/receipts and verify tenant-scoped visibility.
- Sign in as a parent linked to a student and confirm only linked-child fees/receipts are visible.
