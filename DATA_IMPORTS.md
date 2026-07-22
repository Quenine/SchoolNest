# SchoolNest Data Imports

The Import Centre is available at `/dashboard/school-admin/imports` to school owners, principals, head teachers, and school administrators. It supports Students, Staff, Parents/Guardians, Student-Guardian Links, Subjects, Fee Items, Class Fees, and Student Optional Fee Add-ons.

## Workflow

1. Download the module-specific UTF-8 CSV template.
2. Upload a `.csv` file (maximum 2 MB and 2,000 data rows).
3. The server rejects invalid MIME/extensions, invalid UTF-8, duplicate headers, missing required columns, unexpected columns (including `school_id`), and excessive rows.
4. The server resolves tenant-scoped references and returns up to 50 normalized preview rows with Ready, Warning, or Blocked status.
5. “Import X valid rows” re-uploads and revalidates the original file. Browser preview JSON is never trusted.
6. Valid new rows are created, existing matches are skipped, and blocked/persistence-failed rows are stored against the import job.
7. The completion view links to affected records and a formula-safe failed-row CSV.

Imports never update existing records automatically and never accept a school identifier from the file. Plan quotas follow `SCHOOLNEST_ENFORCE_PLAN_LIMITS`; authentication, role checks, RLS, and tenant scoping remain active.

## Templates and matching

- Students: `admission_number, first_name, last_name, other_names, preferred_name, gender, date_of_birth, class_code, arm_code, admission_date, student_status, nationality, state_of_origin, lga, home_address, blood_group, genotype, allergies, medical_notes, guardian_first_name, guardian_last_name, guardian_phone, guardian_email, guardian_relationship`. Admission number is the duplicate key. Classes and arms are school-scoped. Complete guardian details create/match by normalized phone and link the student.
- Staff: `staff_number, first_name, last_name, other_names, gender, phone, email, address, date_of_birth, employment_date, employment_status, staff_category, job_title, department, qualification, emergency_contact_name, emergency_contact_phone`. Staff number is the duplicate key; duplicate email is a warning.
- Guardians: `first_name, last_name, other_names, relationship_label, phone, alternate_phone, email, occupation, address, city, state`. Normalized phone is the primary match.
- Guardian links: `student_admission_number, guardian_phone, guardian_email, relationship_to_student, is_primary, can_pick_up, receives_sms, receives_email`. Both records are resolved inside the current school.
- Subjects: `name, code, section_code, subject_type, is_active`. Subject code is the duplicate key; section is optional and tenant-scoped.
- Fee items: `category_code, name, code, description, billing_frequency, fee_type, applies_to, is_active`. There is intentionally no amount column. Fee code is the duplicate key.
- Class fees: `academic_session_name, term_name, class_code, arm_code, fee_item_code, amount, fee_type`. Blank term creates session-level pricing; no invoices are generated.
- Student add-ons: `student_admission_number, academic_session_name, term_name, optional_fee_item_code, amount, notes`. Blank amount uses the matching optional class-fee amount; supplied values are custom amounts captured in the import audit.

Dates use `YYYY-MM-DD`. Student/staff birth, admission, and employment dates cannot be future dates in `Africa/Lagos`. Boolean values accept true/false, yes/no, y/n, or 1/0.

## Error and audit security

Failed-row exports prepend a single quote to cells beginning with `=`, `+`, `-`, or `@`. Import history records counts, actor, filename, status, and safe module metadata. Medical notes and allergies are not stored in import error audit rows. Normal users never receive raw SQL errors.

Apply `database/migrations/step-4-9-data-imports.sql` before using the Import Centre. Fresh databases receive the same tables and policies from `database/schema.sql`.

If Step 4.9 was already attempted before its RLS helper-name correction, also apply database/migrations/step-4-10-import-centre-completion.sql. It safely recreates only the four import policies.

## Module page entry points

The shared `ModuleImportActions` component constructs template, import, and history routes for Students, Staff, Guardians, Student-Guardian Links, Subjects, Fee Items, Class Fees, and Student Add-ons. Guided workflows remain primary: Fee Setup places compact actions inside the relevant sections, while Student Add-ons keeps manual assignment prominent. Module-specific accessible labels replace obsolete placeholder copy.
