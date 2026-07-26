# Form and Mobile Standards

Required controls use a visible restrained asterisk plus screen-reader text and `aria-required`. HTML requirements and server validation must agree. Completed-action dates are limited to today/current time in the school timezone; due/end/scheduled dates may be future dates.

Forms use one column on narrow screens, 44px minimum controls, full-width mobile primary actions, visible focus, and no hover-only actions. Parent and teacher record tables should render as cards or responsive lists on phones. Admin-heavy tables may scroll only when summaries and actions remain usable.


## Student Add-on cascading controls

Student Add-ons uses a compact responsive control grid and a searchable listbox. Session changes clear Term and Student; Class changes clear Arm and Student; Arm and Term changes clear Student. Search is local to the already tenant-scoped active-student candidates and does not navigate per keystroke. Selected values use `router.replace`; the subtle pending message remains visible while server totals refresh. At 360px and 390px, controls and import actions stack and interactive targets remain at least 44px.

## Step 5 mobile workflows

Attendance uses one-column student cards on phones, 44px status controls, visible selected states, searchable rosters, required excused reasons, restrained pending feedback and a sticky Save/Submit action row. Announcement cards wrap plain text safely and expose priority/read state without colour alone. Acceptance widths are 360px, 390px, 768px and 1024px+; live manual verification is required before release.

Step 5 closure adds responsive cascading assignment/announcement controls, removable keyboard-accessible target chips, mobile-first parent filters and protected attendance editing. Required visual acceptance remains 360×800, 390×844, 768×1024 and 1024px+ using the checklist in STEP_5_ACCEPTANCE.md.

## Step 5 closure migration order

`database/schema.sql` is the canonical fresh-database schema and contains the final Step 5 state. For an existing database where Step 5.1 already succeeded, do not rerun or edit Step 5.1. Apply and validate in this order:

1. Run `database/migrations/step-5-2-step5-closure.sql`.
2. Run the read-only `database/verification/step-5-verification.sql`.
3. Redeploy the application.
4. Complete two-school, role, schedule, expiry, lock, and viewport acceptance checks.

Step 5.2 changes the attendance save RPC to return JSONB, preserves the applied Step 5.1 history, installs operation-specific RLS and least-privilege grants, and keeps attendance table mutation RPC-only. No Results & Grading work is included.