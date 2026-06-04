# Elastic Beanstalk GitHub Actions Deployment

This project has separate Elastic Beanstalk deployment workflows for `main` and
`dev`.

## Branch Targets

- `.github/workflows/deploy-dev-eb.yml`: `dev` -> ECR `pickleplay/dev` -> EB `pickleplay-dev`
- `.github/workflows/deploy-prod-eb.yml`: `main` -> ECR `pickleplay/prod` -> EB `pickleplay-prod`

Each workflow follows the same pattern as the existing backend deployment:
build and push an ECR image, update the environment-specific compose template,
copy it to `docker-compose.yaml`, zip it, and deploy that package to Elastic
Beanstalk.

## AWS Role

The workflows assume this GitHub OIDC role directly:

```text
arn:aws:iam::596776566549:role/BFGithubAction
```

The role should trust GitHub OIDC and have permission to push to ECR and update
Elastic Beanstalk environments.

## Optional GitHub Variables

These repository variables can override the workflow defaults:

```text
EB_APPLICATION_NAME_DEV=pickleplay-dev
EB_APPLICATION_NAME_PROD=pickleplay-prod
EB_ENVIRONMENT_DEV=pickleplay-dev
EB_ENVIRONMENT_PROD=Pickleplay-prod-env
```

Configure frontend build-time values in the `development` and `production`
GitHub environments. These values are passed as Docker build arguments because
Vite embeds `VITE_*` variables when `pnpm build` runs:

```text
VITE_FRONTEND_FORGE_API_URL
VITE_FRONTEND_FORGE_API_KEY
VITE_MIXPANEL_TOKEN_DEV
VITE_MIXPANEL_TOKEN_PROD
```

The deployment workflows set `VITE_APP_ENV` directly to `development` or
`production`.

## Runtime Environment Variables

Configure runtime values in Elastic Beanstalk environment properties or via
Secrets Manager/SSM references:

```text
NODE_ENV=production
PORT=3000
DATABASE_URL
JWT_SECRET
OWNER_OPEN_ID
OAUTH_SERVER_URL
BUILT_IN_FORGE_API_URL
BUILT_IN_FORGE_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID
TWILIO_FROM_NUMBER
TWILIO_MESSAGING_SERVICE_SID
```

Do not rely on Elastic Beanstalk runtime environment properties for `VITE_*`
frontend values. Those must be present when the Docker image is built.

## AWS Permissions

The GitHub OIDC role needs permissions for:

```text
ecr:GetAuthorizationToken
ecr:BatchCheckLayerAvailability
ecr:InitiateLayerUpload
ecr:UploadLayerPart
ecr:CompleteLayerUpload
ecr:PutImage
s3:PutObject
elasticbeanstalk:CreateApplicationVersion
elasticbeanstalk:UpdateEnvironment
elasticbeanstalk:DescribeEnvironments
elasticbeanstalk:DescribeApplications
elasticbeanstalk:DescribeApplicationVersions
```

The Elastic Beanstalk instance profile also needs permission to pull from the
ECR repositories.

## Elastic Beanstalk Bundle Files

The compose templates live here:

```text
docker-compose.dev.yaml
docker-compose.prod.yaml
```

Each workflow updates `services.app.image` to the pushed ECR image URI, copies
the environment-specific file to `docker-compose.yaml`, and zips it for Elastic
Beanstalk.
