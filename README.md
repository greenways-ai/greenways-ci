# Greenways CI

`greenways-ai/greenways-ci` is the central automation repository for Greenways AI projects. Source repositories send lightweight notifications; this repository checks out the exact source revision and runs compilation, tests, packaging, publishing, or deployment.

The design follows the central-CI pattern used by `statstrade-dev/ci`.

## Architecture

```text
greenways-ai/v2
  |
  | repository_dispatch: v2-changed
  | repository, ref, SHA, event, PR metadata
  v
greenways-ai/greenways-ci
  |
  +--> checkout exact v2 source SHA
  +--> checkout foundation-base beside v2
  +--> run the shared infra-foundation-dev:ci image
  +--> call v2 make deps-checkouts
  +--> run source-owned compile and test commands
  +--> upload diagnostics
```

The source SHA is the synchronization contract. A central workflow must never replace a supplied SHA with the current tip of `main`.

## Active pipeline

### Greenways v2 `gwdb`

Workflow: `.github/workflows/v2-gwdb.yml`

Triggers:

- `repository_dispatch` event `v2-changed`
- manual `workflow_dispatch` with a branch, tag, or commit
- pull requests that change the central pipeline itself

Current stages:

1. check out `greenways-ai/v2` at the requested revision
2. check out `zcaudate-xyz/foundation-base` beside `v2`
3. record both resolved commit SHAs
4. pull `ghcr.io/zcaudate-xyz/infra-foundation-dev:ci`
5. mount the workspace and Docker socket into the shared CI image
6. run `make deps-checkouts` from `v2`
7. run `lein check` from `v2/backend`
8. run `lein test :in gwdb` from `v2/backend`
9. upload compile and test logs
10. fail the run when compilation or tests fail

The shared image supplies Java, Leiningen, Docker, and Supabase CLI `2.40.7`. Central CI does not install those tools independently.

The workflow does **not** start or stop Supabase directly. Database-backed tests use the source-owned `gw-dev` scaffold under `backend/docker/gw-dev`, and that scaffold owns its service lifecycle and test configuration.

The Docker socket is mounted into the CI container and the workspace is mounted at the same absolute path. This allows the scaffold's bundled Supabase CLI to start Docker services whose files live in the checked-out `v2` workspace.

## Dependency checkout convention

`v2` owns dependency wiring through:

```bash
make deps-checkouts
```

This follows the `statstrade-core` convention. The central repository checks out dependency repositories beside the project, while the project creates its own Leiningen `checkouts/` links. Central CI must not rewrite `project.clj` or add repository-specific source paths.

For the current backend pipeline:

```text
workspace/
├── foundation-base/
└── v2/
    └── backend/checkouts/foundation-base -> workspace/foundation-base
```

## Dispatch payload

The notifier in `greenways-ai/v2` sends a payload equivalent to:

```json
{
  "repository": "greenways-ai/v2",
  "event": "pull_request",
  "ref": "feature/example",
  "sha": "<source-commit-sha>",
  "base_ref": "main",
  "pr_number": "123",
  "run_id": "<source-workflow-run>"
}
```

The central workflow uses `sha` as the checkout ref and records the resolved value in the run summary.

## Manual validation

From the GitHub Actions page, select **Greenways v2 gwdb**, choose **Run workflow**, and enter a `greenways-ai/v2` branch, tag, or commit SHA.

Equivalent CLI usage:

```bash
gh workflow run v2-gwdb.yml \
  --repo greenways-ai/greenways-ci \
  -f source_ref=main
```

Inspect the run summary to confirm the requested ref resolved to the intended source SHA.

## Repository access

Cross-repository automation currently uses a secret named `GH_TOKEN`.

It needs narrowly scoped permissions for:

- `greenways-ai/v2`: dispatch an event to `greenways-ai/greenways-ci`
- `greenways-ai/greenways-ci`: read the requested private `greenways-ai/v2` revision
- `zcaudate-xyz/foundation-base`: read the dependency source checkout when authentication is required

Prefer a GitHub App or fine-grained token restricted to these repositories. Publishing and deployment credentials should be stored separately in protected environments.

## Diagnostics

The `v2-gwdb` workflow uploads:

```text
v2/backend/lein-check.log
v2/backend/gwdb-test.log
```

Artifacts are retained for 14 days. Compilation and tests are separate steps so both logs are collected during baseline stabilization.

When investigating a failure, verify in this order:

1. requested and resolved `v2` SHA
2. resolved `foundation-base` SHA
3. shared CI image pull
4. `make deps-checkouts` output and symlink target
5. Docker socket and host networking
6. compilation output
7. `gw-dev` scaffold startup output
8. failing `gwdb` namespace or fact

## Legacy workflows

The previous workflow set targeted obsolete applications, packages, commands, and deployment paths. Retirement notes are stored under:

```text
archive/workflows/legacy-v2-monorepo/
```

The complete removed workflows remain available in Git history. Do not restore them directly into `.github/workflows/`; rebuild capabilities from commands verified against the current source layout.

## Adding a pipeline stage

New stages should follow these rules:

- always check out the exact notified source revision
- keep source repository workflows limited to notification
- use project-owned dependency checkout commands
- reuse the shared `infra-foundation-dev:ci` environment where appropriate
- let source-owned test scaffolds manage their own services
- keep pull-request jobs free of publishing or production credentials
- upload useful failure diagnostics
- write resolved source and dependency SHAs into the run summary
- separate validation, publishing, and deployment permissions

Recommended next stages:

1. frontend install, typecheck, lint, Jest, and Turborepo build
2. generated SQL and API reproducibility checks
3. package tarball readiness checks
4. status reporting back to the source commit or pull request
5. protected staging deployment
6. protected production promotion of an already-tested artifact

## Source commands

Current Greenways v2 commands expected by central CI:

```bash
# Dependency checkouts
make deps-checkouts

# Backend
cd backend
lein check
lein test :in gwdb

# Frontend, planned central stage
cd main
corepack enable
yarn install --immutable
yarn typecheck
yarn lint
yarn test --runInBand
yarn build
```

## Contributing

1. Branch from `main`.
2. Keep each workflow focused on one source repository or deployment responsibility.
3. Test changes with `workflow_dispatch` or a pipeline pull request.
4. Confirm the run uses the intended source SHA.
5. Document new events, inputs, secrets, artifacts, and failure modes here.

## License

Private and proprietary to Greenways AI.
