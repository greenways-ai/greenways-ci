# Repository guidance

## Responsibility and authority

Greenways CI is the central orchestration repository for exact revisions of
`statstrade-dev/v2`. The active
[`v2-ci.yml`](.github/workflows/v2-ci.yml) workflow is the source of truth for
slice selection and status reporting. Its reusable workflows own backend,
generated-language, frontend, documentation, and Statstrade deployment jobs.
The root [Makefile](Makefile) is the supported dispatch and observation entry
point; [README.md](README.md) describes the current slices.

Read the active workflow files and the two publishing documents under `docs/`
before changing orchestration. The broad diagrams and examples in
`ARCHITECTURE.md` are background context; an active workflow wins if they
differ.

## Prerequisites

- Node.js for the local environment-loader and production-preflight tests.
- An authenticated `gh` client with access to this repository and
  `statstrade-dev/v2` for remote runs.
- Docker and GHCR access for backend and language jobs.
- Access to the pinned `zcaudate-xyz/foundation-base` revision for those jobs.
- Protected `statstrade-dev/dot-secrets` and deployment environment access for
  the environment and production workflows.

Do not place `GH_TOKEN`, registry credentials, deployment tokens, or secret
repository contents in this repository or in issue/PR evidence.

## Validation

Focused local validation:

```sh
node --test .github/scripts/load-env-files.test.mjs
node --test .github/scripts/statstrade-production.test.cjs
```

Production-preflight tests use mocked GitHub reads and the real workflow text;
they do not deploy or prove live GitHub/provider permissions. The central
`release-contract-tests.yml` workflow runs these tests without provider secrets.

There is no local V2 application test suite in this repository. The normal
validation is the remote workflow dispatch exposed by the Makefile:

```sh
make run-all
make runs
make watch
```

`make run-all` dispatches `v2-ci.yml` for its configured source at `main`.
Confirm the active workflow uses `statstrade-dev/v2`; older examples may retain
the pre-transfer repository name. `make runs` and `make watch` inspect the
resulting GitHub Actions run. Slice-focused dispatches are available as
`make run-core`, `make run-rpc`, `make run-gwbuild`, `make run-gwlink`,
`make run-js`, `make run-dart`, `make run-frontend`, and `make run-docs`.
These commands require the dependencies and access listed above and must not
be reported as passed from a local checkout alone. Run `git diff --check`
for map changes.

## Generated output and deployment

The V2 source repository owns generated RPC, link, and SQL outputs. Greenways
CI only runs the pinned generators and verifies that tracked output is
unchanged; it does not own those source files. Workflow logs, build artifacts,
release manifests, and deployment outputs are run-scoped derived evidence.
`v2-ci.yml`, `statstrade-environment.yml`, and
`statstrade-production.yml` define the CI and protected deployment boundaries.

Production must validate the exact source's stable CI contexts, successful
central artifact run, non-expired artifact, next-channel manifest/digest, and
main/prod ancestry before loading provider configuration. Keep the authenticated
GitHub API preflight; do not reintroduce an unauthenticated private-repository
`git fetch` after a `persist-credentials: false` checkout.

Preserve `statstrade-production` approval, exact-source checkout, and no-build
promotion of the same package layout and configuration used by `next`.
Frontend promotion is not database migration or full-stack promotion.

## Limits and cleanup

This repository contains orchestration, not the V2 application or its
specifications. A passing loader test proves only allowlist parsing. Full
validation and deployment are access- and environment-gated; production
promotion requires an exact V2 `main` descendant and protected secrets.
Remote runs and artifacts are cleaned up by GitHub retention policy, not by a
local reset command.

For rollout work, follow
[greenways-ai/.github](https://github.com/greenways-ai/.github/blob/main/docs/connector-first-delivery.md),
name `https://github.com/greenways-ai/workspace/issues/30` as the sole Primary
issue, and use `Advances` for workspace issue #26.
