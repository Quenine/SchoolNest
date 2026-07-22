# Step 5 Implementation Report

## Architecture findings

- Portal identity is `users_profile.id = auth.uid()`.
- Teacher identity links through `staff_profiles.user_profile_id`.
- Session-specific student placement is `student_enrollments`; `students.current_class_id` is not used as attendance authority.
- Parent visibility resolves `parent_guardians.user_profile_id -> student_guardians -> students`.
- Canonical roles include `school_owner`, `principal`, `head_teacher`, `school_admin`, `teacher`, `class_teacher`, `parent`, and `bursar`.
- No suitable class-to-staff attendance assignment existed, so `class_staff_assignments` was added.
- Existing `audit_logs` is suitable for assignment and attendance/announcement transitions.
- Canonical RLS helpers are `is_platform_super_admin`, `is_school_member`, and `has_school_role`.

## Implementation

Step 5.1 adds explicit assignments, register snapshots/entries, announcements/targets/reads, indexes, RLS, visibility helpers, atomic attendance save and administrator transition RPCs. User interfaces cover admin assignment/attendance/announcements, teacher assigned attendance/class announcements, and parent linked-child attendance/applicable announcements. External channels remain unavailable.

## Manual acceptance

Run the complete A–E checklist from the Step 5 brief using two schools and linked/unlinked users. Test 360, 390, 768 and 1024+ widths. Verify assignment deactivation, future-date rejection, roster persistence, submit/reopen/lock/unlock, unrelated URL denial, audience scheduling/expiry/read state, and zero cross-tenant visibility. These live Supabase checks remain required before production readiness.
