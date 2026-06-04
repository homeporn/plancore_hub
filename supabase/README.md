# Supabase schema

The database schema lives in version control as migrations under
`supabase/migrations`. The baseline (`20260101000000_baseline_schema.sql`) was
captured from the live project and validated by applying it to a clean
PostgreSQL 17 instance.

## Workflow

- **Never edit the baseline migration.** Schema changes go into a new
  timestamped migration: `supabase migration new <name>`.
- After changing the schema, regenerate the typed client so app code stays in
  sync:

  ```bash
  supabase gen types typescript --schema public \
    > packages/data/src/supabase/database.types.ts
  ```

- CI (`.github/workflows/ci.yml`, job `migrations`) applies every migration to a
  fresh database on each push and warns if `database.types.ts` drifts from the
  schema.

## Local development

```bash
supabase start            # local stack (requires Docker)
supabase db reset         # re-apply all migrations from scratch
supabase link --project-ref <ref>   # connect to the remote project
supabase db pull          # capture remote changes as a new migration
```

## Auth dependency

The schema references Supabase-managed objects (`auth.users`, `auth.uid()`).
When applying migrations outside the Supabase stack (e.g. plain Postgres in
CI), those are stubbed first — see the `migrations` job.
