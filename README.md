# PicklePlay App

## Database Migrations

This project uses Drizzle migrations against MySQL. Local development may point at the shared development database, so migration generation and migration application are intentionally separate.

### Scripts

- `pnpm db:generate`: Generate migration files from `drizzle/schema.ts`.
- `pnpm db:migrate`: Apply committed migration files to the database in `DATABASE_URL`.
- `pnpm db:push`: Convenience command that runs generate and migrate together. Do not use this in CI/CD.

### Recommended Flow

1. Change `drizzle/schema.ts`.
2. Run `pnpm db:generate` locally.
3. Review and commit the generated `drizzle/*.sql` and `drizzle/meta/*` files.
4. Push to `develop` for dev deploys, or `main` for production deploys.
5. Apply migrations separately when needed, then push to `develop` for dev deploys or `main` for production deploys.

CI/CD should not generate or apply migration files automatically, because generated files in CI are not reviewed or committed back to git and hosted runners may not have database network access.

Deployment workflows no longer require database URL secrets.

### Production Approval

Production deploys are split into two jobs:

- `build`: builds and pushes the production Docker image.
- `deploy`: waits for the `production` GitHub Environment approval, then deploys to EB.

Configure the `production` environment in GitHub:

1. Go to Repository Settings > Environments > production.
2. Add Required reviewers.
3. Keep production deployment secrets on this environment.

Also protect the `main` branch so `develop` to `main` pull requests require review before merge. This gives production two gates: PR review before merge and environment approval before deploy.

### Safety Notes

When local development points at the shared dev database, running `pnpm db:migrate` changes the schema used by the dev server. Coordinate shared dev migrations before running them.

For destructive schema changes, use a compatible rollout: add new schema first, deploy code that supports both old and new shapes, then remove old columns or tables in a later migration.
