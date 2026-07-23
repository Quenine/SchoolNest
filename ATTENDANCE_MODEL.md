# Attendance Model

Step 5 implements one daily register per school, session, term, date, class and nullable arm. `student_enrollments` is authoritative when the first save initializes the roster; entries then remain as a historical snapshot. Sync adds newly eligible students and never removes earlier entries. Drafts can be edited by authorized staff; submission requires every entry; only administrators can reopen, lock or unlock, and unlock requires a reason. Atomic RPCs validate tenant, assignment, term/session, class/arm, roster, date and transition rules. CSV export is administrator-only and formula-safe.

Teachers are authorized only through active `class_staff_assignments` linked to `staff_profiles.user_profile_id = auth.uid()`. Parents read entries only for children connected through `parent_guardians` and `student_guardians`.

## Functional-readiness closure

Roster synchronization reports eligible enrollment, existing snapshot, newly added, already-present and historically preserved counts. Attendance markers warn before leaving with unsaved status/remark changes and clear the warning only after a successful save or submission. Late is consistently present-equivalent: percentage is `(present + late) / all recorded statuses × 100`. Seven/30-day reporting uses recorded school days only.

Expected registers derive from active current-session enrollment grouped by real class/arm combinations. No empty calendar day is fabricated. Parent filters validate linked child, session/term and date range.
