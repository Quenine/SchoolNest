# SchoolNest TODO

## Completed Foundation

- Next.js App Router foundation
- Supabase clients and Auth wiring
- Register school, login, logout, and role redirects
- Multi-tenant schema foundation
- Foundation reconciliation migration for RLS and helper functions
- Roles, feature flags, and subscription plans
- Protected dashboard shell and role-specific layouts
- Step 3 school setup and core records
- Step 4 manual fees and finance
- Stabilization pass for sessions, terms, class editing, fee category visibility, and finance setup continuity
- Finance simplification and guided setup UX: fee items are labels only, compulsory class fees carry actual amounts, optional fees are billed only when assigned as student add-ons

## Before Step 5

Run the full smoke checklists in `QA_STABILIZATION_REPORT.md` and `UX_STABILIZATION_REPORT.md` against the target Supabase project. For existing Step 4 databases, run `database/migrations/step-4-8-finance-optional-fees.sql` before testing Student Add-ons. Fix any remaining registration, setup, core-record, finance, toast, refresh, or edit-mode regressions before adding new modules.

## Step 5: Attendance & Communication

Next step remains Attendance & Communication, but only after the stabilization checklist passes:

- Daily student attendance
- Staff attendance scaffold
- Class attendance register
- Absentee list
- Parent absence visibility
- Announcements
- Notice board
- Email alert scaffolding
- SMS/WhatsApp placeholders for premium later

## Later Modules

- Results and report cards
- CBT
- Payroll
- Inventory
- Library
- Transport
- Hostel
- Clinic
- Inter-house sports
- Clubs and societies
- Bulk Excel/CSV imports with validation
- Paystack online payments as a premium finance step






## Step 4.9 stabilization status
- Plan limits can be bypassed during development with `SCHOOLNEST_ENFORCE_PLAN_LIMITS=false`.
- Import history schema and security policy are ready; CSV processing UI remains to be completed before release.
- Manual payment filtering/date checks and student add-on auto-fill are implemented.

Next major product step remains: Step 5 � Attendance & Communication (after import processing completion).

## Completed stabilization continuation — July 2026

Functional server-revalidated CSV imports now cover Students, Staff, Parents/Guardians, Student-Guardian Links, Subjects, Fee Items, Class Fees, and Student Optional Fee Add-ons. Every module has a template, upload, preview, validation summary, explicit confirmation, persistence, duplicate skipping, history, error CSV, audit event, and deterministic tests.

The next major product step remains Step 5 — Attendance & Communication. Apply Step 4.9 and complete the authenticated acceptance checklist before beginning Step 5 implementation.

## Manual acceptance pending: import entry points and Student Add-ons

- [ ] Test all module template/import/history links with an authorized school administrator.
- [ ] Test Student Add-ons at 360px, 390px, and desktop widths.
- [ ] Confirm cascading resets, keyboard student search, URL navigation, empty/pending states, optional-fee reset, assignment, and cancellation.
- [ ] Mark overall stabilization complete only after these manual checks pass.

## After Step 5

- [ ] Complete the documented two-school manual acceptance suite for attendance and announcements.
- [ ] Validate 360px, 390px, 768px and desktop experiences with real assigned teachers and linked parents.
- [ ] Next planned product step: Results & grading discovery and design. Do not implement until Step 5 manual acceptance passes.

- [ ] Execute Step 5.1 and its verification SQL on the target Supabase database.
- [ ] Complete every two-school, role, schedule, expiry, lock and viewport check in STEP_5_ACCEPTANCE.md.
- [ ] Do not begin Results & Grading discovery until Step 5 acceptance is signed off.
