# Skill: Database Migrations

Read this file before running ANY Prisma migration command.
Reference: `@.claude/skills/db-migration/SKILL.md`

## The cardinal rule

`prisma migrate dev` — staging only, never production.
`prisma migrate deploy` — production only, after SQL review.

Never swap these. A `migrate dev` on production resets your data.

## Step-by-step migration workflow

### Step 1 — Make the schema change
Edit the `schema.prisma` file for the relevant service.
Run `npx tsc --noEmit` to confirm the TypeScript types are still valid.

### Step 2 — Generate the migration on staging
```bash
cd apps/{service-name}
npx prisma migrate dev --name {descriptive-name}
```

Name conventions:
```
add_credit_score_to_farmers
add_plot_polygon_column
rename_area_to_area_acres
drop_legacy_farm_notes
```

Names must be lowercase, underscores only, verb-first, descriptive.
Never: `migration1`, `update`, `fix`, `temp`.

### Step 3 — Review the generated SQL
Open the file created in `prisma/migrations/{timestamp}_{name}/migration.sql`.

Check for:
- [ ] Destructive operations: `DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN` — require explicit approval
- [ ] Missing `IF EXISTS` guards on drops
- [ ] Correct data type for new columns
- [ ] Default values on new NOT NULL columns (required or existing rows fail)
- [ ] Index creation on foreign keys and frequently-filtered columns
- [ ] No accidental full-table rewrites

If anything looks wrong, delete the migration folder and fix the schema before retrying.

### Step 4 — Test the migration end-to-end on staging
```bash
# Confirm migrations applied
npx prisma migrate status

# Confirm Prisma client regenerated
npx prisma generate

# Run the full test suite
pnpm test

# Seed staging DB if needed
npx prisma db seed
```

All tests must pass before Step 5.

### Step 5 — Backup production database before deploying
```bash
# On the VPS
pg_dump -U postgres -d {service}_db > /opt/backups/{service}_db_$(date +%Y%m%d_%H%M%S).sql
```
Confirm the backup file exists and is non-zero bytes.

### Step 6 — Deploy migration to production
```bash
cd apps/{service-name}
DATABASE_URL={prod_connection_string} npx prisma migrate deploy
```

`migrate deploy` applies only pending migrations — it never creates new ones.
It will output each migration name and `Migration applied`.

### Step 7 — Verify production schema
```bash
npx prisma migrate status --schema=prisma/schema.prisma
```
All migrations should show `Applied`. If any show `Pending`, something went wrong — investigate before proceeding.

### Step 8 — Run smoke tests against production
```bash
./scripts/health-check.sh {service-name}
```
And manually verify the affected feature works.

## Safe patterns for common operations

### Adding a column (safe)
```prisma
model Farm {
  newColumn String? // nullable = safe, existing rows get NULL
}
// OR
  newColumn String @default("") // non-nullable with default = safe
```

### Renaming a column (NEVER do this directly)
Direct rename breaks all queries immediately. Use the two-step approach:
```
Step 1: Add new column, copy data, mark old column as deprecated
Step 2: After deploy confirmed, remove old column in a separate migration
```

### Removing a column (high risk)
1. Deploy application code that no longer references the column
2. Wait 24 hours and confirm no errors
3. Only then run the migration to drop the column

### Adding a NOT NULL column to a table with existing rows
```prisma
// WRONG — breaks existing rows
newColumn String

// CORRECT — provide a default
newColumn String @default("unknown")
// Then in a follow-up migration after backfilling real values, remove the default if needed
```

### Adding an index
```prisma
@@index([farmId, scheduledDate]) // composite index
@@index([ownerId]) // single column
```
Large table indexes can lock the table during creation. On tables > 100k rows, create indexes `CONCURRENTLY` in raw SQL in the migration file.

## What NOT to do

- Never hand-edit files inside `prisma/migrations/` — Prisma tracks a checksum
- Never delete a migration that has been applied to any environment
- Never run `prisma db push` on staging or production — it bypasses migration history
- Never run `prisma migrate reset` on any environment with real data — it drops everything
- Never add a migration and skip the SQL review step, even for "small" changes
