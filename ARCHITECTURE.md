# CI/CD Architecture for Multi-Project Monorepo

## Overview

This document describes the CI/CD architecture for the Greenways multi-project monorepo, using GitHub Actions reusable workflows for maximum modularity and maintainability.

## Design Goals

1. **Modularity**: Each workflow has a single responsibility
2. **Reusability**: Common patterns extracted into reusable workflows
3. **Parallelization**: Independent jobs run in parallel
4. **Selectivity**: Only run what's needed for each change
5. **Scalability**: Easy to add new apps and packages
6. **Flexibility**: Support different tech stacks (Vitest, Jest, Playwright)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CI/CD ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TRIGGERS                                                                    │
│  ├── Push to main      → Full pipeline + Production deploy                  │
│  ├── Push to staging   → Full pipeline + Staging deploy                     │
│  ├── Push to develop   → CI only (no deploy)                                │
│  ├── Pull Request      → CI only                                            │
│  ├── Manual trigger    → Configurable options                               │
│  └── API dispatch      → External triggers                                  │
│                           │                                                  │
│                           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    ci-cd.yml (ORCHESTRATOR)                          │    │
│  │                                                                      │    │
│  │   Phase 1: Quality Gate ─────────────────────┐                      │    │
│  │   ├── uses: _quality-gate.yml                │                      │    │
│  │   └── outputs: success/failure               │                      │    │
│  │                                              │                      │    │
│  │   Phase 2: Build Packages (Matrix) ──────────┤                      │    │
│  │   ├── uses: _build-package.yml × N packages  │                      │    │
│  │   └── parallel: true                         │                      │    │
│  │                                              │                      │    │
│  │   Phase 3: Build Apps (Matrix) ──────────────┤                      │    │
│  │   ├── uses: _build-app.yml × 4 apps          │                      │    │
│  │   │   ├── gw-spaces (Vitest + Playwright)    │                      │    │
│  │   │   ├── gw-vibe-engine (Jest + Playwright) │                      │    │
│  │   │   ├── gw-ragtrain (build only)           │                      │    │
│  │   │   └── wombat-kernal (Vitest)             │                      │    │
│  │   └── parallel: true                         │                      │    │
│  │                                              │                      │    │
│  │   Phase 4: Storybooks ───────────────────────┤                      │    │
│  │   └── Build both storybooks                  │                      │    │
│  │                                              │                      │    │
│  │   Phase 5: Deploy ───────────────────────────┘                      │    │
│  │   ├── Chromatic (visual regression)            │                      │    │
│  │   └── Vercel (staging/production)              │                      │    │
│  │                                                                      │    │
│  │   Phase 6: Summary                                                   │    │
│  │   └── Aggregate all results                                          │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                           │                                                  │
│           ┌───────────────┼───────────────┐                                  │
│           │               │               │                                  │
│           ▼               ▼               ▼                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                         │
│  │ _quality-    │ │ _build-      │ │ _build-      │                         │
│  │ gate.yml     │ │ package.yml  │ │ app.yml      │                         │
│  │              │ │              │ │              │                         │
│  │ • Checkout   │ │ • Checkout   │ │ • Checkout   │                         │
│  │ • Install    │ │ • Install    │ │ • Install    │                         │
│  │ • Lint       │ │ • Restore    │ │ • Restore    │                         │
│  │ • TypeCheck  │ │   cache      │ │   packages   │                         │
│  │              │ │ • Turbo build│ │ • Build app  │                         │
│  │              │ │ • Upload     │ │ • Run tests  │                         │
│  │              │ │   artifacts  │ │ • E2E tests  │                         │
│  └──────────────┘ └──────────────┘ └──────────────┘                         │
│                                                              │              │
│           ┌──────────────────────────────────────────────────┘              │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────┐                                                            │
│  │ _deploy.yml  │                                                            │
│  │              │                                                            │
│  │ • Vercel    │                                                            │
│  │ • Netlify   │                                                            │
│  └──────────────┘                                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Reusable Workflows

### `_quality-gate.yml`

**Purpose**: Fast feedback on code quality issues

**Inputs**:
- `node-version`: Node.js version (default: 20)
- `main-dir`: Path to main directory (default: main)

**Jobs**:
1. Checkout repository
2. Install dependencies (Yarn with frozen lockfile)
3. Run ESLint
4. Run TypeScript type checking
5. Run format check (optional)

**Outputs**: None (pass/fail only)

**Usage**:
```yaml
jobs:
  quality:
    uses: ./.github/workflows/_quality-gate.yml
    with:
      node-version: '20'
```

---

### `_build-package.yml`

**Purpose**: Build a single package with Turbo caching

**Inputs**:
- `package`: Package name (required, without @greenways/ prefix)
- `node-version`: Node.js version (default: 20)
- `main-dir`: Path to main directory (default: main)

**Jobs**:
1. Checkout repository
2. Install dependencies
3. Restore Turbo cache
4. Build package (`yarn turbo build --filter=@greenways/{package}`)
5. Upload dist artifacts
6. Run package tests (continue-on-error)

**Outputs**: None (artifacts uploaded)

**Usage**:
```yaml
jobs:
  build-ui-common:
    uses: ./.github/workflows/_build-package.yml
    with:
      package: 'spaces-ui-common'
```

---

### `_build-app.yml`

**Purpose**: Build and test a single application

**Inputs**:
- `app`: App name (required)
- `node-version`: Node.js version (default: 20)
- `main-dir`: Path to main directory (default: main)
- `test-runner`: Test framework (vitest, jest, none)
- `run-unit-tests`: Run unit tests (default: true)
- `run-e2e`: Run E2E tests (default: false)
- `e2e-runner`: E2E framework (playwright, none)

**Secrets**:
- Supabase credentials
- Test user credentials

**Jobs**:
1. **Build Job**:
   - Checkout
   - Install dependencies
   - Restore package builds
   - Build application
   - Run unit tests (if enabled)
   - Upload build artifacts

2. **E2E Job** (conditional):
   - Download build artifacts
   - Install Playwright browsers
   - Run E2E tests
   - Upload results

**Outputs**: None (artifacts uploaded)

**Usage**:
```yaml
jobs:
  build-gw-spaces:
    uses: ./.github/workflows/_build-app.yml
    with:
      app: 'gw-spaces'
      test-runner: 'vitest'
      run-e2e: true
      e2e-runner: 'playwright'
    secrets: inherit
```

---

### `_deploy.yml`

**Purpose**: Deploy application to various platforms

**Inputs**:
- `app`: App name (required)
- `platform`: Deployment platform (vercel, netlify)
- `environment`: Target environment (staging, production)
- `node-version`: Node.js version (default: 20)
- `main-dir`: Path to main directory (default: main)

**Secrets**:
- Platform-specific tokens (VERCEL_TOKEN, NETLIFY_TOKEN, etc.)

**Jobs**:
1. Checkout repository
2. Install dependencies
3. Download build artifacts
4. Deploy to platform
5. Set environment URL output

**Outputs**:
- `url`: Deployment URL

**Usage**:
```yaml
jobs:
  deploy:
    uses: ./.github/workflows/_deploy.yml
    with:
      app: 'gw-spaces'
      platform: 'vercel'
      environment: 'production'
    secrets: inherit
```

## Orchestrator Workflow (ci-cd.yml)

### Phase 1: Quality Gate

Always runs first to catch issues early.

```yaml
quality-gate:
  uses: ./.github/workflows/_quality-gate.yml
```

### Phase 2: Build Packages

Uses a matrix strategy to build all packages in parallel.

```yaml
build-packages:
  needs: quality-gate
  strategy:
    matrix:
      package: [spaces-ui-common, spaces-ui-layouts, ...]
  uses: ./.github/workflows/_build-package.yml
  with:
    package: ${{ matrix.package }}
```

**Package Dependency Order**:
While the matrix runs in parallel, Turbo handles the actual dependency graph:

```
lib-config ────┬───▶ lib-utils ────┬───▶ ui-common ────┐
               │                   │                   │
               └───▶ lib-supabase ─┘                   │
                                                       ▼
ui-config ─────────────────────────────────────────▶ ui-layouts

vibe-config ────┬───▶ vibe-algo ────┬───▶ vibe-db ────▶ vibe-ui

wombat-kernel ────▶ wombat-cli
```

### Phase 3: Build Apps

Each app has its own job with specific configuration:

| App | Test Runner | E2E | Notes |
|-----|-------------|-----|-------|
| gw-spaces | Vitest | Playwright | Main application |
| gw-vibe-engine | Jest | Playwright | Uses Jest for legacy reasons |
| gw-ragtrain | none | none | Tests not yet implemented |
| wombat-kernal | Vitest | none | Kernel application |

### Phase 4: Build Storybooks

Builds both Storybook instances for component documentation.

### Phase 5: Deployments

Conditional deployments based on:
- Branch (main = production, staging = staging)
- Input parameters
- Previous job success

## Configuration Matrix

### Apps Configuration

```yaml
apps:
  gw-spaces:
    platform: netlify
    test_runner: vitest
    e2e_runner: playwright
    deploy: true
    
  gw-vibe-engine:
    platform: netlify
    test_runner: jest
    e2e_runner: playwright
    deploy: true
    
  gw-ragtrain:
    platform: vercel
    test_runner: none
    e2e_runner: none
    deploy: false  # Not ready yet
    
  wombat-kernal:
    platform: none
    test_runner: vitest
    e2e_runner: none
    deploy: false
```

### Packages Configuration

All packages in the matrix:

**Spaces (10 packages)**:
- lib-config, lib-utils, lib-supabase
- ui-config, ui-common, ui-editor, ui-layouts
- feat-auth, feat-billing, feat-super

**Vibe (4 packages)**:
- config, algo, db, ui

**Wombat (2 packages)**:
- kernel, cli

## Caching Strategy

### 1. Yarn Dependencies
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'yarn'
```

### 2. Turbo Build Cache
```yaml
- uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ github.sha }}
```

### 3. Package Build Artifacts
```yaml
- uses: actions/upload-artifact@v4
  with:
    name: package-{name}-dist
    path: packages/**/{name}/dist
```

### 4. Playwright Browsers
Installed fresh each run (can be cached with more complex setup)

## Adding New Projects

### Adding a New Package

1. Add to the matrix in `ci-cd.yml`:

```yaml
build-packages:
  strategy:
    matrix:
      package:
        # ... existing packages
        - my-new-package
```

No other changes needed! The reusable workflow handles the rest.

### Adding a New App

1. **Add job to `ci-cd.yml`**:

```yaml
app-my-new-app:
  name: 🆕 My New App
  needs: [quality-gate, build-packages]
  if: |
    github.event.inputs.apps == 'all' || 
    contains(github.event.inputs.apps, 'my-new-app')
  uses: ./.github/workflows/_build-app.yml
  with:
    app: 'my-new-app'
    test-runner: 'vitest'  # or 'jest' or 'none'
    run-unit-tests: true
    run-e2e: false
    e2e-runner: 'playwright'
  secrets: inherit
```

2. **Add deployment job** (optional):

```yaml
deploy-my-new-app:
  name: 🚀 Deploy My New App
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

3. **Update summary job**:

Add to the jobs list in the summary step.

4. **Add Makefile commands**:

```makefile
ci-my-app:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f apps=my-new-app -f run-tests=true
```

### Adding a New Storybook

1. Add build step to `build-storybooks` job:

```yaml
- name: Build New Storybook
  run: yarn turbo build --filter=@greenways/my-new-storybook
```

2. Add to artifact upload path.

## Best Practices

### 1. Job Naming
Use emojis and clear names:
```yaml
app-gw-spaces:
  name: 🚀 GW-Spaces
```

### 2. Continue on Error
For non-critical jobs:
```yaml
continue-on-error: true
```

### 3. Conditional Execution
Use `if` conditions to skip unnecessary work:
```yaml
if: |
  github.event.inputs.apps == 'all' || 
  contains(github.event.inputs.apps, 'gw-spaces')
```

### 4. Timeouts
Always set timeouts:
```yaml
timeout-minutes: 20
```

### 5. Artifact Retention
Short retention for build artifacts:
```yaml
retention-days: 1
```

Longer for reports:
```yaml
retention-days: 14
```

## Troubleshooting

### Workflow Not Triggering
Check the `on:` section and ensure the branch/filter matches.

### Jobs Skipped
Check the `needs:` and `if:` conditions. Jobs may be skipped if:
- Previous required job failed
- `if` condition evaluates to false
- Matrix filter excludes it

### Cache Issues
Clear cache if needed:
```bash
gh cache list --repo greenways-ai/greenways-ci
gh cache delete <key> --repo greenways-ai/greenways-ci
```

### Secrets Not Available
Ensure secrets are set at the repository level, not just environment level.

## Future Enhancements

1. **Change Detection**: Only run jobs for changed packages/apps
2. **Test Sharding**: Split E2E tests across multiple runners
3. **Visual Testing**: Add screenshot comparison
4. **Performance Budgets**: Fail builds on bundle size increases
5. **Dependency Updates**: Automated PRs for dependency updates
