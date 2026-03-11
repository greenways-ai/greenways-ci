# greenways-ci

CI/CD workflows for Greenways AI projects.

## Architecture

This repository uses a **modular, reusable workflow architecture** for managing a multi-project monorepo:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKFLOW STRUCTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  REUSABLE WORKFLOWS ( underscore prefix )                                    │
│  ├── _quality-gate.yml      - Lint + TypeScript checks                       │
│  ├── _build-package.yml     - Build a single package                         │
│  ├── _build-app.yml         - Build + test a single app                      │
│  └── _deploy.yml            - Deploy to Vercel/Netlify                       │
│                                                                              │
│  ORCHESTRATOR WORKFLOWS                                                      │
│  ├── ci-cd.yml              - Main CI/CD pipeline (monorepo)                 │
│  ├── gw-publish-packages.yml - Package publishing to npm                     │
│  └── web-main.yml           - Legacy web deployments                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Workflows

### Main CI/CD (ci-cd.yml)

The primary workflow that coordinates CI/CD for the entire monorepo (`/main`):

**Phase 1: Quality Gate**
- ESLint, TypeScript type checking, format checking

**Phase 2: Build Packages (Parallel)**
- All spaces/*, vibe/*, and wombat/* packages
- Uses Turbo for caching and incremental builds

**Phase 3: Build & Test Apps (Parallel)**
- **gw-spaces**: Vitest + Playwright E2E
- **gw-vibe-engine**: Jest + Playwright E2E
- **gw-ragtrain**: Build only (no tests yet)
- **wombat-kernal**: Vitest

**Phase 4: Build Storybooks**
- gw-spaces-storybook
- gw-vibe-engine-storybook

**Phase 5: Deploy Storybook (Chromatic)**
- Visual regression testing
- Auto-accept on main branch

**Phase 6: Deploy Apps (Conditional)**
- Deploy to Netlify (GW-Spaces and GW-Vibe-Engine)

### Package Publishing (gw-publish-packages.yml)

Publishes packages to npm:
- Verifies and builds all packages
- Publishes to npm registry
- Creates GitHub releases

### Legacy Web Deployments (web-main.yml)

Deploys static sites to Netlify:
- Staging/Production environments
- Uses local deployment scripts

## Project Structure

The monorepo (`/main`) contains:

```
main/
├── apps/
│   ├── gw-spaces/              Next.js + Vitest + Playwright
│   ├── gw-vibe-engine/         Next.js + Jest + Playwright
│   ├── gw-ragtrain/            Next.js (tests TBD)
│   └── wombat-kernal/          Next.js + Vitest
├── packages/
│   ├── spaces/                 UI components & features
│   │   ├── lib-*               Utility libraries
│   │   ├── ui-*                UI components
│   │   └── feat-*              Feature modules
│   ├── vibe/                   VibeEngine packages
│   └── wombat/                 Wombat kernel packages
└── storybook/
    ├── gw-spaces-storybook/
    └── gw-vibe-engine-storybook/
```

## Triggers

### Automatic (on push)

| Branch | Trigger |
|--------|---------|
| `main` | Full CI/CD + Production Deploy |
| `staging` | CI + Staging Deploy |
| `develop` | CI only |
| PR to `main`/`staging` | CI only |

### Manual (workflow_dispatch)

Configure via GitHub UI or CLI:
- Environment (staging/production)
- Apps to build (all or specific)
- Run tests (yes/no)
- Run E2E tests (yes/no)
- Deploy (yes/no)
- Deploy Storybook (yes/no)

### Repository Dispatch (API)

Trigger from external systems:

```bash
# Trigger full CI
curl -X POST \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/greenways-ai/greenways-ci/dispatches \
  -d '{"event_type":"main-changed"}'

# Trigger production deploy
curl -X POST \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/greenways-ai/greenways-ci/dispatches \
  -d '{"event_type":"main-changed-prod"}'
```

## Usage

### Makefile Commands

```bash
# General
make list              # List all workflows
make runs              # View recent runs
make watch             # Watch latest run

# CI/CD Pipeline
ci                     # Run CI/CD (default)
ci-staging             # CI for staging (no deploy)
ci-prod                # Full pipeline with E2E + deploy
ci-test                # Tests only
ci-test-trpc           # tRPC tests only (gw-spaces)
ci-e2e                 # With E2E tests

# Specific Apps
ci-spaces              # GW-Spaces only
ci-vibe                # GW-Vibe-Engine only
ci-ragtrain            # GW-RAGTrain only

# Deployments
deploy-spaces          # Deploy GW-Spaces
deploy-vibe            # Deploy GW-Vibe-Engine
deploy-ragtrain        # Deploy GW-RAGTrain
deploy-prod            # Deploy all to production

# Storybook
storybook-chromatic    # Deploy to Chromatic

# Package Publishing
packages-publish       # Dry run
packages-publish-now   # Actual publish

# Legacy
web-deploy             # Legacy web deployments
```

### GitHub CLI

```bash
# Run CI/CD with custom options
gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
  -f environment=staging \
  -f apps=gw-spaces,gw-vibe-engine \
  -f run-tests=true \
  -f run-e2e=true \
  -f deploy=true

# Run specific app only
gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
  -f apps=gw-spaces \
  -f run-e2e=true

# Deploy Storybook only
gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
  -f deploy-storybook=true \
  -f run-tests=false
```

## Required Secrets

### All Workflows

| Secret | Description |
|--------|-------------|
| `GH_TOKEN` | GitHub PAT with repo access |
| `SLACK_WEBHOOK_URL` | Slack notifications (optional) |

### Main CI/CD (ci-cd.yml)

| Secret | Description |
|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `TEST_USER_EMAIL` | E2E test user email |
| `TEST_USER_PASSWORD` | E2E test user password |
| `CHROMATIC_PROJECT_TOKEN` | Chromatic project token |
| `NETLIFY_TOKEN` | Netlify auth token |
| `NETLIFY_WEB_TEST_ID` | Netlify site ID for GW-Spaces (staging) |
| `NETLIFY_WEB_PROD_ID` | Netlify site ID for GW-Spaces (production) |
| `NETLIFY_VIBE_TEST_ID` | Netlify site ID for GW-Vibe-Engine (staging) |
| `NETLIFY_VIBE_PROD_ID` | Netlify site ID for GW-Vibe-Engine (production) |

### Package Publishing

| Secret | Description |
|--------|-------------|
| `NPM_TOKEN` | npm auth token |

### Legacy Web Deployments (web-main.yml)

These secrets are used by the legacy web-main.yml workflow:

| Secret | Description |
|--------|-------------|
| `NETLIFY_TOKEN` | Netlify auth token |
| `NETLIFY_WEB_TEST_ID` | Staging site ID |
| `NETLIFY_WEB_PROD_ID` | Production site ID |

## Design Principles

### 1. Modularity
Each workflow has a single responsibility. The orchestrator (`ci-cd.yml`) composes reusable workflows.

### 2. Parallelization
Independent jobs run in parallel:
- All packages build simultaneously
- All apps build simultaneously
- Different test suites run in parallel

### 3. Selective Execution
Only run what's needed:
- Skip apps not in the `apps` filter
- Skip E2E tests unless explicitly enabled
- Skip deploy on non-main branches

### 4. Caching
Aggressive caching at multiple levels:
- Yarn dependencies
- Turbo build cache
- Package build artifacts
- Playwright browsers

### 5. Flexibility
Support different test runners:
- **Vitest**: gw-spaces, wombat packages
- **Jest**: gw-vibe-engine
- **Playwright**: E2E tests for all apps

## Adding a New App

To add a new app to the CI/CD pipeline:

1. **Create app workflow call in `ci-cd.yml`**:

```yaml
app-my-new-app:
  name: 🆕 My-New-App
  needs: [quality-gate, build-packages]
  if: |
    github.event.inputs.apps == 'all' || 
    contains(github.event.inputs.apps, 'my-new-app')
  uses: ./.github/workflows/_build-app.yml
  with:
    app: 'my-new-app'
    test-runner: 'vitest'  # or 'jest' or 'none'
    run-e2e: true
    e2e-runner: 'playwright'
  secrets: inherit
```

2. **Add deployment job** (if needed):

```yaml
deploy-my-new-app:
  name: 🚀 Deploy My-New-App
  needs: [app-my-new-app]
  if: |
    always() && 
    needs.app-my-new-app.result == 'success' &&
    github.ref == 'refs/heads/main'
  uses: ./.github/workflows/_deploy.yml
  with:
    app: 'my-new-app'
    platform: 'vercel'
    environment: 'production'
  secrets: inherit
```

3. **Update summary job** to include the new app

4. **Add Makefile commands**:

```makefile
ci-my-app:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f apps=my-new-app -f run-tests=true

deploy-my-app:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f apps=my-new-app -f deploy=true
```

## Troubleshooting

### Jobs Skipped Unexpectedly
Check the `if` conditions in the workflow. Jobs may be skipped based on:
- Branch name
- Input parameters
- Previous job results

### Cache Not Working
Turbo cache is keyed by git SHA. If you need to clear cache:
```bash
gh cache list --repo greenways-ai/greenways-ci
gh cache delete <key> --repo greenways-ai/greenways-ci
```

### Secrets Not Available
Ensure secrets are set at the repository or organization level, not just environment level.
