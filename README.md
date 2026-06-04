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
5. The EB deploy workflows run `pnpm db:migrate` before deploying the new EB application version.

CI/CD should apply migrations only. It should not generate new migration files, because generated files in CI are not reviewed or committed back to git.

For the dev EB workflow, configure one of these GitHub Actions secrets in the `development` environment:

- `DATABASE_URL_DEV`
- `DATABASE_URL`

`DATABASE_URL_DEV` is preferred when both exist.

For the prod EB workflow, configure one of these GitHub Actions secrets in the `production` environment:

- `DATABASE_URL_PROD`
- `DATABASE_URL`

`DATABASE_URL_PROD` is preferred when both exist.

### Production Approval

Production deploys are split into two jobs:

- `build`: builds and pushes the production Docker image.
- `deploy`: waits for the `production` GitHub Environment approval, then runs `pnpm db:migrate` and deploys to EB.

Configure the `production` environment in GitHub:

1. Go to Repository Settings > Environments > production.
2. Add Required reviewers.
3. Keep production secrets, such as `DATABASE_URL_PROD`, on this environment.

Also protect the `main` branch so `develop` to `main` pull requests require review before merge. This gives production two gates: PR review before merge, and environment approval before migration/deploy.

### Safety Notes

When local development points at the shared dev database, running `pnpm db:migrate` changes the schema used by the dev server. Prefer applying shared dev migrations through the deploy workflow.

For destructive schema changes, use a compatible rollout: add new schema first, deploy code that supports both old and new shapes, then remove old columns or tables in a later migration.
