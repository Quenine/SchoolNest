# Step 5 Acceptance

Use synthetic data only. Apply all migrations through Step 5.1, then run `database/verification/step-5-1-verification.sql` in the Supabase SQL editor. It must emit the Step 5.1 verification-passed notice without exceptions.

## Test setup

Create School A with Admin A, Teacher A, Teacher B and Parent A. Create JSS 1 with Gold and Blue arms, at least two active students per arm, a current session and term, and link Parent A only to one Gold student. Link Teacher A’s portal user to an active staff profile and assign that profile to JSS 1 Gold. Leave Teacher B unassigned.

Create School B with a separate admin, teacher, parent, classes, students, enrollments and guardian links. Never reuse School A IDs.

## A. Class assignments

1. Admin A opens Class Staff Assignments and selects the current session and JSS 1.
2. Confirm only JSS 1 arms appear; changing class clears the arm.
3. Search Teacher A by name, number, title and department.
4. Assign Teacher A to Gold and confirm Active plus portal-linked status.
5. Confirm duplicate active assignment is rejected.
6. Confirm Teacher A sees Gold only; Teacher B sees no class.
7. Deactivate and confirm access disappears while the inactive history remains.

## B. Attendance

1. Restore Teacher A’s assignment and open today’s Gold register.
2. Confirm only active current-session Gold enrollments appear.
3. Mark all present, then set one absent, one late, and one excused with a reason.
4. Change a status and attempt internal navigation and browser close; confirm the unsaved warning.
5. Save draft; confirm warning clears and refresh persists values.
6. Add a newly enrolled Gold student and run Sync roster. Confirm added, already-present, eligible and historical counts.
7. Remove/change an enrollment and sync; confirm the historical student is not removed.
8. Submit; confirm unmarked submission is rejected and successful submission becomes read-only.
9. Admin reopens, resubmits, locks and deliberately unlocks. Confirm every transition is audited.
10. Confirm future dates, unrelated teacher URLs and School B IDs are rejected.
11. Confirm overview expected/submitted/draft/locked/not-started counts use real enrollment only.
12. Confirm 7/30-day trends use recorded days only and late counts as present-equivalent.
13. Export CSV and inspect formula-safe fields and tenant context.

## C. Parent attendance

1. Parent A sees only linked children.
2. With multiple linked children, no ambiguous child is silently selected; with one, it may default safely.
3. Verify session-filtered terms, This term, Last 30 days and valid custom ranges.
4. Confirm reversed custom dates are rejected.
5. Confirm days/present/absent/late/excused and percentage match the register.
6. Confirm Parent A cannot query an unrelated School A child or any School B child.

## D. Announcements

1. Admin A creates school-wide, multi-role, multi-class and Gold-arm announcements.
2. Confirm class changes clear incompatible arm choices and duplicate chips are removed.
3. Confirm audience estimates count each eligible profile once and never expose contacts.
4. Teacher A can target assigned Gold/class scope only; Teacher B cannot craft a class target.
5. Confirm Parent A sees school/parent-role/linked Gold announcements but not Blue.
6. Confirm School B users see none of School A’s content.
7. Schedule a notice and confirm it is hidden before effective time and visible afterward.
8. Confirm expired/archived notices leave recipient feeds but remain in management history.
9. Mark read twice and confirm one read row; compare eligible, in-app reads and estimated unread.
10. Confirm no SMS/email/WhatsApp delivery success appears.

## E. Viewports and accessibility

Test Class Staff, admin attendance, teacher overview/marker, parent attendance, all announcement pages and authoring at 360×800, 390×844, 768×1024 and 1024px+. Confirm no critical horizontal scrolling, 44px targets, visible focus, keyboard-operable target chips/status controls, wrapping messages, usable dialogs/toasts and a non-obstructive sticky attendance action bar.

## Safe isolation queries

Run as the relevant authenticated users, never with production personal data:

```sql
select school_id, class_id, arm_id from public.class_staff_assignments;
select school_id, attendance_date, class_id, arm_id, status from public.attendance_registers;
select school_id, title, audience_scope, status from public.announcements;
select school_id, announcement_id, user_profile_id from public.announcement_reads;
```

Every returned `school_id` must equal the signed-in user’s authorized school. Parent and teacher result sets must also satisfy their linked-child, assignment and audience restrictions.
