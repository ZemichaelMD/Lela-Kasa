# Prisma Migration Drift — Troubleshooting Guide

Load this skill when the user reports a **Prisma migration drift error** (e.g. `prisma migrate dev` says *"Drift detected: Your database schema is not in sync with your migration history"*).

## 1. Understand the drift

Run `pnpm prisma migrate dev` to get the full diff. The output shows:
- `[+] Added tables` — tables that exist in the DB but have no migration file
- `[+] Added column` — columns that exist in the DB
- `[*] Changed the <table>` — differences grouped by table

**Root cause:** Someone edited `schema.prisma` directly, then created/migrated the changes through a different path (e.g. direct SQL, or the migration was lost).

## 2. Decide on a fix strategy

| Strategy | When to use | Steps |
|----------|------------|-------|
| **Reset** | Development only, no real data | `pnpm prisma migrate reset` — drops and recreates from scratch |
| **Baseline** | You want to re-sync & start fresh | Delete all migration folders, run `prisma migrate dev --name init` to create one big initial migration |
| **Manual migration** | Production or has real data (recommended) | Create a new migration SQL file that matches the drift. See §3 |

**For production or data you care about, always choose the manual migration route.**

## 3. Create a manual drift-fix migration

1. **Study the drift output** — list what needs to be added/changed.
2. **Create a new migration directory:**
   ```bash
   mkdir -p prisma/migrations/YYYYMMDDHHMMSS_descriptive_name
   ```
3. **Write `migration.sql`** with raw SQL that matches exactly what the output described.
4. **Run `pnpm prisma migrate dev`** — it should now report *"Already up to date"* or *"No drift detected"*.

Key rules:
- Use `CREATE TABLE`, `ALTER TABLE ADD COLUMN`, `CREATE INDEX`, `ALTER TABLE ADD CONSTRAINT` as needed
- Make **all new columns nullable** unless you have a data backfill strategy
- Always add a data backfill step for existing rows right after adding the column

## 4. Data backfill — critical safety step

When adding a non-optional column (or one that should eventually be populated), add an `UPDATE` at the end of the migration:

```sql
-- Safe backfill: populate new column from existing data
UPDATE "Sale" SET "updatedById" = "createdById" WHERE "updatedById" IS NULL;
```

Guidelines:
- Always use `WHERE <column> IS NULL` to make it **idempotent** (safe to re-run)
- Prefer batch/filtered updates over full-table scans for large tables
- If a column truly cannot have a default, keep it nullable in the schema too

## 5. Verify the fix

1. `pnpm prisma migrate dev` — should show *"Already up to date"*
2. `pnpm prisma generate` — regenerates the client
3. `pnpm prisma studio` — inspect the affected tables visually
4. Run any test suite: `pnpm test`

## 6. Prevent future drift

- Enforce a **code review rule**: never commit `schema.prisma` changes without a matching migration
- Add a **CI check** that fails if `prisma migrate dev` detects drift:
  ```bash
  pnpm prisma migrate status --exit-code
  ```
- Use the **read-only migrations pattern**: prefix migrations that only sync schema with `fix_` so they're clearly distinguishable from logical migrations

## 7. Owner PIN reset flow (common drift scenario)

If the drift involves `CustomerPinResetToken` or `CustomerEmailVerificationToken`, the backend already has these endpoints:

| Endpoint | Purpose |
|----------|---------|
| `POST /customers/:id/owner-reset-pin` | Owner sets a new random PIN for a customer, returns plaintext |
| `POST /customers/:id/reset-pin` | Sends a reset code to the customer's email |
| `POST /customers/:id/send-email-otp` | Sends email OTP for verification |
| `POST /customers/:id/verify-email` | Verifies email via OTP code |

These require the drift-fix migration to be applied first (the tables must exist).

## 8. Rollback if something goes wrong

```sql
-- Reverse the drift-fix migration (adapt to your specific changes)
DROP TABLE IF EXISTS "CustomerPinResetToken" CASCADE;
DROP TABLE IF EXISTS "CustomerEmailVerificationToken" CASCADE;
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "email";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "emailVerified";
ALTER TABLE "Sale" DROP COLUMN IF EXISTS "updatedById";
```

Then in `prisma_migrate_lock` or migration history, remove the drift-fix migration entry if Prisma tracks it — or use `prisma migrate resolve --rolled-back <migration_name>`.
