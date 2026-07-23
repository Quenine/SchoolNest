# SchoolNest

SchoolNest is a multi-tenant SaaS foundation for Nigerian nursery, primary, and secondary schools.

## Current Scope

Implemented modules include:

- Supabase Auth foundation and role-based dashboard routing
- School setup and core records: profile, sessions, terms, classes, arms, subjects, staff, students, parents/guardians
- Manual fees and finance: categories, fee items, class fees, student add-ons, invoices, manual payments, receipts, debtors, parent fee visibility
- Tenant-aware RLS model and audit logging scaffolding

## Environment

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key is required for the school registration bootstrap and must never be exposed to browser/client code.

## Database Setup

For a new database:

1. Run `database/schema.sql`.
2. Run `database/seed.sql`.
3. Run `database/migrations/step-2-foundation-reconciliation.sql`.

For an existing Step 3/Step 4 database, run:

1. `database/seed.sql` if roles/plans/features may be stale.
2. `database/migrations/step-2-foundation-reconciliation.sql` if foundation RLS reconciliation has not already been applied.

Step 4.8 adds `student_optional_fees` for optional student add-ons. For existing Step 4 databases, also run `database/migrations/step-4-8-finance-optional-fees.sql`.

## Supabase Auth Setup

In Supabase dashboard:

- Configure Site URL and redirect URLs for localhost and production.
- Decide whether email confirmation is required.
- Keep anon and service-role keys in the correct environment variables.

## Stabilization Smoke Test

Before Step 5, run both `QA_STABILIZATION_REPORT.md` and `UX_STABILIZATION_REPORT.md`. At minimum, verify:

1. Register a school at `/register-school`.
2. Login as the owner and open `/dashboard/school-admin`.
3. Complete school profile.
4. Create an academic session and first, second, third terms.
5. Edit a session/term through the explicit Edit panel and confirm a toast appears.
6. Create or run Nigerian default structure.
7. Edit a class and confirm code/read-only fields are not casually editable.
8. Add subject, staff, student, and parent/guardian.
9. Link student to parent.
10. Create default fee categories and confirm they are visible immediately.
11. Create fee item without entering an amount.
12. Create a class fee for the fee item and enter Amount for this class.
13. Confirm Fee Setup shows guided tabs, not all finance forms at once.
14. Add compulsory class fees and confirm Base Class Total updates.
15. Create an optional fee price, assign it from Student Add-ons, then generate invoice and confirm the add-on appears only for that student.
16. Issue the invoice, record part payment, generate receipt, and confirm debtor balance.
17. Confirm parent fee visibility where a parent login is available.

## Finance Model

Fee Setup uses a guided flow: Fee Items, Class Compulsory Fees, Optional Fees, Student Add-ons, and Class Totals. Fee Items define what is being charged. They are labels/items only and do not carry billed amounts in the app UI or business logic.

Class Fees define the amount a class or arm pays for a session or term. Compulsory Class Fees (`is_required=true`) make up the Base Class Total for students in that class or arm.

Optional Fees are class-level prices (`is_required=false`). They are not billed automatically. A bursar or school admin assigns them to individual students from Student Add-ons.

Student invoice total is computed as:

```text
Compulsory Class Fees + active Student Add-ons + student-specific surcharges - discounts/waivers
```

Invoices use `class_fee_structures.amount` for compulsory fees and `student_optional_fees.amount` for assigned add-ons. The legacy `fee_items.amount` database column remains only for backward compatibility.

See `FINANCE_MODEL.md` for the detailed working rule.

## Development

```bash
npm run lint
npm run build
npm test -- --run --pool=vmThreads --maxWorkers=1 --minWorkers=1
```








## Development plan limits
Set SCHOOLNEST_ENFORCE_PLAN_LIMITS=false locally and in Vercel during development. Production launch must explicitly set it to 	rue only after commercial rules are finalized. Authentication, authorization, RLS, tenant isolation, and paid integrations are unaffected.

## Import Centre

After applying Step 4.9, school administrators can use `/dashboard/school-admin/imports`. See `DATA_IMPORTS.md` for templates, limits, matching, duplicate behavior, security, and acceptance testing.

## Step 5 — Attendance & Communication

Daily Attendance and in-app Announcements are available for school administrators, explicitly assigned teachers, and linked parents. Apply `database/migrations/step-5-1-attendance-and-communication.sql` after the Step 2 foundation and current Step 4 migrations. See `ATTENDANCE_MODEL.md`, `COMMUNICATION_MODEL.md`, and `STEP_5_IMPLEMENTATION_REPORT.md`. External message delivery is not part of this release.

Step 5 live acceptance instructions are in `STEP_5_ACCEPTANCE.md`. Run the Step 5.1 migration, then its read-only verification SQL before role testing. Attendance percentage treats late as present-equivalent and uses recorded attendance entries only. Announcement metrics are eligibility/read estimates, never external delivery.
