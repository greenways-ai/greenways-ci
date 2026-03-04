# greenways-ci

CI/CD workflows for Greenways AI projects.

## Workflows

### Web Deployments

- **web-main.yml** - Deploys the test environment to Vercel and Netlify
- **web-prod.yml** - Deploys the production environment to Vercel and Netlify

### Triggers

Workflows can be triggered via:
- `repository_dispatch` events from the main repo
- Manual `workflow_dispatch` triggers

### Required Secrets

| Secret | Description |
|--------|-------------|
| `GH_TOKEN` | GitHub Personal Access Token with repo access |
| `VERCEL_TOKEN` | Vercel authentication token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_WEB_TEST_ID` | Vercel project ID for test environment |
| `VERCEL_WEB_PROD_ID` | Vercel project ID for production environment |
| `NETLIFY_TOKEN` | Netlify authentication token |
| `NETLIFY_WEB_TEST_ID` | Netlify site ID for test environment |
| `NETLIFY_WEB_PROD_ID` | Netlify site ID for production environment |

## Usage

### Manual Trigger

```bash
# Deploy to test
gh workflow run web-main.yml --repo greenways-ai/greenways-ci

# Deploy to production
gh workflow run web-prod.yml --repo greenways-ai/greenways-ci
```

### Repository Dispatch (from gw-v2)

To trigger deployments from the main repository:

```bash
# Trigger test deployment
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
