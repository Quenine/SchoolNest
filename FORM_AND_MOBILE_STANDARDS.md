# Form and Mobile Standards

Required controls use a visible restrained asterisk plus screen-reader text and `aria-required`. HTML requirements and server validation must agree. Completed-action dates are limited to today/current time in the school timezone; due/end/scheduled dates may be future dates.

Forms use one column on narrow screens, 44px minimum controls, full-width mobile primary actions, visible focus, and no hover-only actions. Parent and teacher record tables should render as cards or responsive lists on phones. Admin-heavy tables may scroll only when summaries and actions remain usable.


## Student Add-on cascading controls

Student Add-ons uses a compact responsive control grid and a searchable listbox. Session changes clear Term and Student; Class changes clear Arm and Student; Arm and Term changes clear Student. Search is local to the already tenant-scoped active-student candidates and does not navigate per keystroke. Selected values use `router.replace`; the subtle pending message remains visible while server totals refresh. At 360px and 390px, controls and import actions stack and interactive targets remain at least 44px.

## Step 5 mobile workflows

Attendance uses one-column student cards on phones, 44px status controls, visible selected states, searchable rosters, required excused reasons, restrained pending feedback and a sticky Save/Submit action row. Announcement cards wrap plain text safely and expose priority/read state without colour alone. Acceptance widths are 360px, 390px, 768px and 1024px+; live manual verification is required before release.

Step 5 closure adds responsive cascading assignment/announcement controls, removable keyboard-accessible target chips, mobile-first parent filters and protected attendance editing. Required visual acceptance remains 360×800, 390×844, 768×1024 and 1024px+ using the checklist in STEP_5_ACCEPTANCE.md.
