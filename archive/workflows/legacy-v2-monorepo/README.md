# Legacy Greenways v2 workflows

The workflows previously stored in `.github/workflows/` were archived on 2026-07-07 because they targeted an earlier Greenways monorepo layout and no longer represented `greenways-ai/v2`.

They remain recoverable from Git history immediately before the `ci/archive-legacy-add-v2-gwdb` change. The removed workflow paths were:

- `.github/workflows/_quality-gate.yml`
- `.github/workflows/_build-package.yml`
- `.github/workflows/_build-app.yml`
- `.github/workflows/_deploy.yml`
- `.github/workflows/_test-trpc.yml`
- `.github/workflows/ci-cd.yml`
- `.github/workflows/gw-publish-packages.yml`
- `.github/workflows/web-main.yml`

## Why they were retired

The legacy workflow set referenced obsolete application and package names, including `gw-spaces`, `gw-vibe-engine`, `gw-ragtrain`, `wombat-kernal`, and multiple `@greenways/*` packages. The active repository instead uses the `main/` Yarn workspace, `@gw-spaces/*` package names, and the Clojure backend under `backend/`.

The old workflows also mixed validation, package publication, deployment, and environment credentials. The replacement starts with a narrow repository-dispatch contract and a reproducible `gwdb` test pipeline. Additional compilation, frontend, packaging, or deployment stages should be added only after their commands are verified against the current `greenways-ai/v2` layout.

## Reference architecture

The replacement follows the central-CI pattern used by `statstrade-dev/ci`:

1. the source repository sends `repository_dispatch` with the exact source SHA
2. this repository checks out that SHA
3. CI provisions required local services
4. CI runs the project-specific build or test command
5. results are associated with the central workflow run and the source SHA recorded in its summary
