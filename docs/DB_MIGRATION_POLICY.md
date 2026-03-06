# DB Migration Policy

## Safe rollout for schema changes
1. Create a migration that adds new fields as nullable or with a default.
2. Deploy migration.
3. Backfill data with a script or API job.
4. Create a second migration to enforce `NOT NULL` / stricter constraints.
5. Deploy second migration.

## Rules
- Never edit or delete old migrations already applied in production.
- Always create a new migration folder for each change.
- Use `prisma migrate deploy` in production.
- Keep destructive changes behind a dedicated migration reviewed manually.

## Quick commands
- Generate client: `npx prisma generate`
- Apply prod migrations: `npx prisma migrate deploy`
- Seed test accounts: `npm run seed`
