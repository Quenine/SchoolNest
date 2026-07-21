# SchoolNest Finance Model

This document records the user-facing SchoolNest finance model before Step 5 work begins.

## Guided Workflow

1. Create Fee Items.
2. Set Class Compulsory Fees for each class, arm, session, or term.
3. Set Optional Fees for each class, arm, session, or term.
4. Assign Optional Fees to students from Student Add-ons.
5. Generate invoices.

## Core Rule

Student invoice total is:

```text
Compulsory Class Fees + active Student Add-ons + student-specific surcharges - discounts/waivers
```

## Fee Items

Fee Items define what can be charged. Examples: Tuition, Books, PTA Levy, Exam Fee, Uniform, Feeding, Transport, Boarding.

Fee Items are labels/items only. They do not ask for amount in the UI and `fee_items.amount` is not used by invoice logic.

Fee Items can be marked as:

- Compulsory: usually included in class compulsory fees.
- Optional: available for selected students, such as transport, feeding, or boarding.

## Class Compulsory Fees

Class Compulsory Fees define how much every student in a selected class or arm pays for a selected session or term.

Example:

- Tuition: NGN 60,000
- Exam Fee: NGN 5,000
- PTA Levy: NGN 3,000

Base Class Total: NGN 68,000

## Optional Fees

Optional Fees define class-level prices but are not billed automatically.

Example optional fees:

- Transport: NGN 25,000
- Feeding: NGN 30,000
- Boarding: NGN 80,000

These become part of a student's invoice only after assignment from Student Add-ons.

## Student Add-ons

Student Add-ons assign optional fee prices to individual students.

Only active rows in `student_optional_fees` are included on generated invoices. Cancelled add-ons stay as history and are ignored by invoice totals.

## Invoice Examples

Student without optional fees:

```text
Base Class Total: NGN 68,000
Student Add-ons: NGN 0
Invoice Total: NGN 68,000
```

Student with transport:

```text
Base Class Total: NGN 68,000
Transport Add-on: NGN 25,000
Invoice Total: NGN 93,000
```

Student with transport and feeding:

```text
Base Class Total: NGN 68,000
Transport Add-on: NGN 25,000
Feeding Add-on: NGN 30,000
Invoice Total: NGN 123,000
```

Student-specific discounts, waivers, corrections, or surcharges are applied after compulsory fees and add-ons.

## Backward Compatibility

The legacy `fee_items.amount` column remains in the database for compatibility with earlier Step 4 schemas. It is deprecated in the app model and should not be used for UI or business logic.
