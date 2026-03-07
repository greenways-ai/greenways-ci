# greenways-ci

CI/CD workflows for Greenways AI projects.

## Workflows

### Web Deployments

- **web-main.yml** - Deploys to Netlify (handles both staging and production)

### Hunter-RAG CI/CD

- **hunter-rag-ci.yml** - Comprehensive CI/CD for Hunter-RAG (Narrative Hunter) project
  - Code quality checks (lint, typecheck, format)
  - Unit tests with coverage (Node 18/20 matrix)
  - Build verification
  - E2E tests with Playwright (optional)
  - Deployment to Vercel
  - Slack notifications

### Triggers

Workflows can be triggered via:
- `repository_dispatch` events from the main repo (`gw-v2`)
- Manual `workflow_dispatch` triggers with environment selection

### Required Secrets

| Secret | Description |
|--------|-------------|
| `GH_TOKEN` | GitHub Personal Access Token with repo access |
| `NETLIFY_TOKEN` | Netlify authentication token |
| `NETLIFY_WEB_TEST_ID` | Netlify site ID for test/staging environment |
| `NETLIFY_WEB_PROD_ID` | Netlify site ID for production environment |

## Usage

### Automatic Deployment (via git push)

- Push to `main` branch → Deploys to **production**
- Push to other branches → Deploys to **staging**

### Manual Trigger

```bash
# Deploy to staging
gh workflow run web-main.yml --repo greenways-ai/greenways-ci -f environment=staging

# Deploy to production  
gh workflow run web-main.yml --repo greenways-ai/greenways-ci -f environment=production

# Or use the Makefile
cd cache/greenways-ci
make deploy-staging
make deploy-prod
```

### Repository Dispatch (from gw-v2)

To trigger deployments from the main repository:

```bash
# Trigger staging deployment
curl -X POST \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/greenways-ai/greenways-ci/dispatches \
  -d '{"event_type":"ui-changed"}'

# Trigger production deployment
curl -X POST \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/greenways-ai/greenways-ci/dispatches \
  -d '{"event_type":"ui-changed-prod"}'
```

## Hunter-RAG Usage

### Automatic CI/CD (via git push)

When you push changes to `src-js/hunter-rag/` in the `gw-v2` repo:

- **Push to `main`** → Triggers production deployment with E2E tests
- **Push to `develop`** → Triggers staging deployment (no E2E)
- **Pull Request** → Triggers test run (no deployment)

### Manual Trigger

```bash
# Run Hunter-RAG CI with defaults (staging, tests only)
gh workflow run hunter-rag-ci.yml --repo greenways-ai/greenways-ci

# Run with E2E tests
gh workflow run hunter-rag-ci.yml --repo greenways-ai/greenways-ci \
  -f environment=staging -f run-e2e=true

# Deploy to production
gh workflow run hunter-rag-ci.yml --repo greenways-ai/greenways-ci \
  -f environment=production -f deploy=true

# Or use the Makefile
cd cache/greenways-ci
make hunter-rag-staging    # Staging with tests
make hunter-rag-prod       # Production with E2E
make hunter-rag-test       # Tests only (no deploy)
make hunter-rag-e2e        # With E2E tests
```

### Required Secrets for Hunter-RAG

| Secret | Description |
|--------|-------------|
| `GH_TOKEN` | GitHub Personal Access Token with repo access |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `VERCEL_TOKEN` | Vercel authentication token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications |

## How It Works

### Web Deployments (Netlify)

The workflow uses the local deployment script (`scripts/deploy-netlify.sh`) from the `gw-v2` repository:

1. Checks out the `gw-v2` repo with submodules
2. Determines the target environment (staging vs production)
3. Runs `./scripts/deploy-netlify.sh <environment>`
4. The script handles building and deploying to Netlify

### Hunter-RAG CI/CD (Vercel)

The Hunter-RAG workflow runs comprehensive CI/CD:

1. **Quality Gate** - ESLint, Prettier, TypeScript checks
2. **Unit Tests** - Runs on Node 18 and 20 with coverage threshold
3. **Build** - Creates production Next.js build
4. **E2E Tests** (optional) - Playwright browser tests
5. **Deploy** - Deploys to Vercel (staging or production)
6. **Notify** - Sends Slack notification on failure

This ensures consistency between local development and CI deployments.
