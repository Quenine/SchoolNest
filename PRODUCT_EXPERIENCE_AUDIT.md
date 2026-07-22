# Product Experience Audit

## Findings and fixes

- Critical: manual payments exposed every invoice and trusted cross-student submissions. Added dependent filtering and server ownership/balance/status checks.
- High: completed payments accepted future timestamps. Added Africa/Lagos-aware browser and server limits.
- High: optional add-on amount defaulted to zero. It now follows the selected configured fee and marks custom amounts.
- Medium: required labels were inconsistent. Shared fields now render accessible required markers, including text areas.
- Medium: development plan quotas blocked setup. Server enforcement now defaults off behind `SCHOOLNEST_ENFORCE_PLAN_LIMITS` while metadata remains intact.
- High: bulk import was placeholder-only. Import audit tables and security contract were added; full Import Centre processing remains deferred and must not be represented as enabled.

## Pages reviewed

Students, staff, guardians, classes/arms, subjects, sessions/terms, Fee Setup, add-ons, invoices, payments, receipts, debtor, bursar, parent, authentication, registration, layouts/sidebar.

## Mobile readiness

Navigation and forms are responsive; finance forms now stack. Admin tables still rely on horizontal scrolling and parent/teacher card conversion remains necessary.

## Manual acceptance checklist

- Toggle plan enforcement false/true and create beyond/at quota.
- Select students with zero, one, and multiple outstanding invoices.
- Try cross-student, over-balance, paid/cancelled, and future-dated payments.
- Select and change optional fees; verify standard/custom amount indicators.
- Check required labels with keyboard and screen reader at phone/tablet/desktop widths.
- Apply migration and verify tenant-isolated import history policies.


## Import Centre and continuation audit

Reviewed and implemented: Import Centre/index, all eight module routes, API template/preview/import/error export, Students import actions, sidebar, student/staff date inputs and schemas, session/term validation, finance destructive actions, add-ons, payments, invoices, receipts, and Fee Setup.

Responsive implementation review covers 360px/390px single-column upload and preview cards, 768px table transition, and 1024px+ two-column Import Centre cards. Existing parent pages remain compact and readable; admin-heavy legacy tables retain horizontal scrolling. Automated browser viewport inspection could not run because no browser backend was available in the development environment, so final device verification remains on the manual acceptance checklist rather than being represented as completed.

Manual acceptance checklist:
- Apply Step 4.9 and sign in as a school administrator.
- Download each of the eight templates.
- Preview/import valid and partially invalid files; confirm counts and affected pages.
- Verify student guardian creation/linking and add-on blank-amount fallback.
- Download error CSV and open it in spreadsheet software to confirm formula safety.
- Verify a second tenant cannot resolve or download another school’s records/jobs.
- Test required markers, date boundaries, dialogs, forms, tables, and toasts at 360, 390, 768, and 1024+ pixels.
