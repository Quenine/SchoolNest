# Schema Fix Notes

## Original Error

Supabase returned:

```text
ERROR: 42830: there is no unique constraint matching given keys for referenced table "terms"
```

## Root Cause

Several child tables use tenant-scoped composite foreign keys such as:

```sql
foreign key (school_id, term_id) references public.terms(school_id, id)
```

PostgreSQL requires the referenced column set to be backed by a primary key or unique constraint. `terms` had a primary key on `id` and a unique constraint on `(school_id, academic_session_id, name)`, but it did not have `unique (school_id, id)`.

## Tables Fixed

The full schema now ensures these tenant-scoped referenced keys exist before later child tables are created:

- `school_branches_school_id_id_key`
- `academic_sessions_school_id_id_key`
- `terms_school_id_id_key`

The `terms` table definition also includes `unique (school_id, id)` directly.

## Nullable Composite References

Nullable composite references such as `(school_id, term_id)`, `(school_id, arm_id)`, `(school_id, category_id)`, and `(school_id, invoice_id)` are intentionally kept. PostgreSQL does not enforce the composite foreign key when the nullable referenced id is null. When the id is present, the pair must match the same tenant.

## Fresh Supabase Run

For a fresh database:

1. Run `database/schema.sql`.
2. Run `database/seed.sql`.
3. Run `database/migrations/step-2-foundation-reconciliation.sql` for foundation RLS policies and additive reconciliation.

## If Partial Tables Already Exist

If the first `schema.sql` run failed after creating early tables, rerun the corrected `database/schema.sql`. The top-level enums, initial tables, indexes, and tenant-key constraints are now safer for reruns. If Supabase still reports a duplicate object from an older partial run, run only the relevant repair block from this file or use `database/migrations/step-2-foundation-reconciliation.sql` after confirming which tables exist.

## Follow-up Syntax Error

Supabase later reported:

```text
ERROR: 42601: syntax error at or near "$"
LINE 200: do $$$
```

The root cause was malformed PostgreSQL dollar quoting in standalone `DO` blocks. Some blocks opened with `do $$$` but closed with `end $$;`, which is not a valid matching delimiter pair.

The schema now normalizes those blocks to the tagged form:

```sql
DO $schoolnest$
BEGIN
  ...
END
$schoolnest$;
```

This was a SQL syntax repair only. It did not add product features, remove Step 3/4 schema work, or change application UI behavior.
