# Form and Mobile Standards

Required controls use a visible restrained asterisk plus screen-reader text and `aria-required`. HTML requirements and server validation must agree. Completed-action dates are limited to today/current time in the school timezone; due/end/scheduled dates may be future dates.

Forms use one column on narrow screens, 44px minimum controls, full-width mobile primary actions, visible focus, and no hover-only actions. Parent and teacher record tables should render as cards or responsive lists on phones. Admin-heavy tables may scroll only when summaries and actions remain usable.


## Student Add-on cascading controls

Student Add-ons uses a compact responsive control grid and a searchable listbox. Session changes clear Term and Student; Class changes clear Arm and Student; Arm and Term changes clear Student. Search is local to the already tenant-scoped active-student candidates and does not navigate per keystroke. Selected values use `router.replace`; the subtle pending message remains visible while server totals refresh. At 360px and 390px, controls and import actions stack and interactive targets remain at least 44px.
