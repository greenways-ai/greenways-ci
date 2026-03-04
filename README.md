# greenways-ci

CI/CD workflows for Greenways AI projects.

## Workflows

### Web Deployments

- **web-main.yml** - Deploys to Netlify (handles both staging and production)

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

## How It Works

The workflow now uses the local deployment script (`scripts/deploy-netlify.sh`) from the `gw-v2` repository:

1. Checks out the `gw-v2` repo with submodules
2. Determines the target environment (staging vs production)
3. Runs `./scripts/deploy-netlify.sh <environment>`
4. The script handles building and deploying to Netlify

This ensures consistency between local deployments and CI deployments.
