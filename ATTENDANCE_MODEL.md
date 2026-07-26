# Attendance Model

Step 5 implements one daily register per school, session, term, date, class and nullable arm. `student_enrollments` is authoritative when the first save initializes the roster; entries then remain as a historical snapshot. Sync adds newly eligible students and never removes earlier entries. Drafts can be edited by authorized staff; submission requires every entry; only administrators can reopen, lock or unlock, and unlock requires a reason. Atomic RPCs validate tenant, assignment, term/session, class/arm, roster, date and transition rules. CSV export is administrator-only and formula-safe.

Teachers are authorized only through active `class_staff_assignments` linked to `staff_profiles.user_profile_id = auth.uid()`. Parents read entries only for children connected through `parent_guardians` and `student_guardians`.

## Functional-readiness closure

Roster synchronization reports eligible enrollment, existing snapshot, newly added, already-present and historically preserved counts. Attendance markers warn before leaving with unsaved status/remark changes and clear the warning only after a successful save or submission. Late is consistently present-equivalent: percentage is `(present + late) / all recorded statuses � 100`. Seven/30-day reporting uses recorded school days only.

Expected registers derive from active current-session enrollment grouped by real class/arm combinations. No empty calendar day is fabricated. Parent filters validate linked child, session/term and date range.

## Step 5 closure migration order

`database/schema.sql` is the canonical fresh-database schema and contains the final Step 5 state. For an existing database where Step 5.1 already succeeded, do not rerun or edit Step 5.1. Apply and validate in this order:

1. Run `database/migrations/step-5-2-step5-closure.sql`.
2. Run the read-only `database/verification/step-5-verification.sql`.
3. Redeploy the application.
4. Complete two-school, role, schedule, expiry, lock, and viewport acceptance checks.

Step 5.2 changes the attendance save RPC to return JSONB, preserves the applied Step 5.1 history, installs operation-specific RLS and least-privilege grants, and keeps attendance table mutation RPC-only. No Results & Grading work is included.