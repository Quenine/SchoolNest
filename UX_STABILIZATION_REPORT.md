# UX Stabilization Report

## Scope

This pass improved the existing SchoolNest foundation, setup, core-record, and finance UX. It did not add Step 5 or any new product module.

## UX Problems Fixed

- Forms now trigger dashboard-wide toast notifications for success and error feedback.
- Successful actions call `router.refresh()` in the shared form wrapper after server-side `revalidatePath` calls.
- Create/edit flows on key setup and finance pages now use explicit Add/Edit disclosure panels instead of raw always-editable records.
- Important identifiers are shown as read-only in edit forms, including class/section/subject/category/fee codes, staff numbers, and admission numbers.
- Pending submit buttons can now show clearer labels such as Creating, Updating, Assigning, Removing, and Recording.
- Field validation errors are displayed in form context and errors also appear as toasts.
- Finance setup now uses a guided tabbed flow so users see Fee Items, Class Compulsory Fees, Optional Fees, Student Add-ons, and Class Totals one major section at a time.

## Action And Refresh Improvements

- `ActionForm` emits success/error toasts from returned server action messages.
- `ActionForm` refreshes the current route after successful actions.
- `ActionForm` can reset create forms after success.
- Setup actions revalidate setup, profile, sessions, classes, subjects, staff, students, and parents routes.
- Finance actions revalidate school admin finance, bursar finance, parent finance, invoices, payments, receipts, and debtors routes.
- The shared action state now includes `ok`, `success`, `message`, `errors`, `fieldErrors`, and `error` for a clearer result contract while preserving existing compatibility.

## Toast Behavior

- Toasts are rendered globally from `ToastProvider` in the root layout.
- Supported tones: success, error, info, warning.
- Toasts auto-dismiss after a few seconds and can be manually dismissed.
- Toasts use accessible live-region behavior for normal dashboard feedback.

## Edit Behavior

- Sessions and terms: Add and Edit panels are explicit; current status is shown with badges.
- Sections/classes/arms: Add and Edit panels are explicit; status and graduating-class state are shown with badges; codes are read-only in edit mode.
- Subjects: Add, Assign, and Edit panels are explicit; codes are read-only in edit mode.
- Staff: Add and Edit panels are explicit; staff number is read-only in edit mode.
- Students: Add, Link Guardian, Edit Student, and Change Class panels are explicit; admission number is read-only in edit mode.
- Parents/guardians: Add and Edit panels are explicit.
- Fee categories/items/structures: Add/Edit/Assign panels are explicit; codes are read-only in edit mode; deactivate/remove actions remain available.

## Finance Amount Model

- Fee Items define what is being charged, such as Tuition, Books, PTA, or Examination.
- Fee Items do not carry the billed amount in the app UI or business logic.
- Class Fees define how much a selected class or arm pays for a selected session or term.
- Compulsory Class Fees are included in every invoice for matching students.
- Optional Fees define class-level prices but are billed only after assignment to a student from Student Add-ons.
- Student invoice total is compulsory class fees plus active student add-ons, adjusted by student-specific discounts, waivers, corrections, or surcharges.
- Class fee amount is labeled `Amount for this class`.
- The fee setup page shows compulsory Base Class Total and separate Optional Fee Prices.

## Manual UX Smoke Test Checklist

1. Open Fee Setup.
2. Confirm only guided setup/tabs show, not all forms at once.
3. Create default categories.
4. Add compulsory fee item.
5. Add optional fee item.
6. Select class/session/term.
7. Add compulsory class fees.
8. Confirm Base Class Total updates.
9. Add optional fee prices.
10. Confirm optional fees do not affect Base Class Total.
11. Assign optional fees to one student.
12. Generate invoice.
13. Confirm student with optional fee has higher total.
14. Confirm student without optional fee has only Base Class Total.
15. Record payment and see updated invoice balance without manual refresh.
16. Generate receipt and confirm it appears.
17. Confirm debtors page updates.
18. Confirm parent fee page still only shows linked children.

## Known Limitations

- Native disclosure panels are used instead of custom modals/drawers to keep this pass light and reliable.
- Edit panels do not auto-close after success because the implementation avoids additional client state complexity.
- Live Supabase E2E automation was not added.
- Parent finance visibility still depends on a parent user profile being linked to a guardian record.
- The legacy `fee_items.amount` database column remains for backward compatibility but is deprecated in the app model.

## Before Step 5

Run the UX smoke checklist above against the target Supabase project. Step 5 Attendance and Communication should start only after the workflow feels reliable to a school admin, bursar, and parent user.





## Focused product-experience pass
Implemented centralized development quota configuration, accessible required-label primitives, timezone date helpers, dependent manual-payment invoices, and optional-fee amount auto-fill. Import history schema and standards were established. Full CSV preview/processing remains a release blocker.

## Import Centre completion

The eight-module Import Centre is implemented with server-side revalidation, tenant-derived school identity, RLS-backed history, formula-safe error CSV files, responsive previews, and create-only duplicate behavior. Step 4.9 RLS helper names were corrected before deployment to match the established schema functions.

Date rollout now covers student birth/admission dates, staff birth/employment validation (including CSV), payment timestamps, session/term ranges, and term containment within sessions. Shared native confirmation dialogs protect staff deactivation and key finance cancellation, removal, reversal, and void actions.
