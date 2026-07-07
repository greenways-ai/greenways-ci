# Greenways CI

`greenways-ai/greenways-ci` is the central execution repository for Greenways
AI projects. Source repositories publish lightweight, correlated requests;
this repository checks out exact source revisions and runs validation,
publishing, or deployment jobs.

## Current v2 architecture

```text
greenways-ai/v2
  |
  | path detection
  | source commit statuses
  | repository_dispatch: v2-ci-requested
  | correlation ID + exact SHA + segment flags
  v
greenways-ai/greenways-ci
  |
  +--> one segmented workflow run
        +--> gwdb validation, when requested
        +--> documentation build and publishing, when requested
        +--> diagnostics and run summaries
        +--> source status updates linked to the central run
```

The source SHA is the synchronization contract. Central jobs must not replace a
supplied SHA with a moving branch.

## Active workflow

Workflow: `.github/workflows/v2-ci.yml`

A single `v2-ci-requested` dispatch creates one central Actions run. The `gwdb`
and `docs` jobs are selected from the payload's segment flags and can execute in
parallel. Unrequested jobs are skipped before a runner is allocated.

This replaces the former `v2-gwdb.yml` and `v2-docs.yml` top-level workflows,
which both subscribed to every dispatch and produced duplicate or no-op entries
in the Actions history.

The workflow accepts:

- `repository_dispatch` event `v2-ci-requested`
- manual dispatch with independent core, RPC, docs, and publish flags
- pull requests that change the central workflow or its documentation

### Segmented v2 gwdb

Requested backend work performs:

1. exact `greenways-ai/v2` checkout
2. adjacent `zcaudate-xyz/foundation-base` checkout
3. source and dependency SHA recording
4. shared CI image pull
5. project-owned `make deps-checkouts`
6. one `lein check`
7. `lein test :in gwdb.core` when requested
8. `lein test :in gwdb.rpc` when requested
9. segment-specific diagnostic artifact upload
10. commit-status reporting to the source SHA

Core changes also request RPC validation because RPC namespaces depend on core
database definitions. RPC-only changes do not run the core suite.

The source contexts are:

```text
greenways-ci/gwdb-core
greenways-ci/gwdb-rpc
```

Central CI updates only requested contexts. The source workflow reports
unrequested contexts as successful skips so the contexts can safely be
required by branch protection.

### V2 documentation

The docs job runs only when the dispatch requests the docs segment. It builds
the exact source SHA, uploads Docusaurus diagnostics and output, and publishes
GitHub Pages only when the source ref is `main`.

The source context is:

```text
greenways-ci/docs
```

Manual dispatch accepts a source ref and an explicit publish flag.

## Correlation

Every v2 dispatch has a correlation ID:

```text
<source-repository>:<source-sha>:<source-run-id>:<source-run-attempt>
```

The request carries the exact source SHA, source workflow URL and identifiers,
pull-request metadata, a bounded changed-file sample, and requested segments.
Extended metadata is nested to remain within GitHub's limit of ten top-level
`client_payload` properties.

All selected jobs share the same central workflow URL and correlation ID. This
allows navigation in both directions:

```text
v2 commit -> source notification run -> central run
central summary -> source run and exact source SHA
```

## Database lifecycle

Central CI does not start or stop Supabase directly.

Database-backed tests use the source-owned scaffold under:

```text
v2/backend/docker/gw-dev/
v2/backend/config/scaffold/supabase-gw-dev.edn
```

The shared CI container mounts the workspace at the same absolute path, mounts
the Docker socket, and uses host networking so the scaffold can manage its
bundled services.

## Dependency checkout convention

`v2` owns dependency wiring:

```bash
cd v2
make deps-checkouts
```

Central CI checks out dependency repositories beside the project. The project
creates its own Leiningen `checkouts/` links. Central workflows must not rewrite
`project.clj` or add repository-specific source paths.

## Shared environment

Backend validation uses:

```text
ghcr.io/zcaudate-xyz/infra-foundation-dev:ci
```

The image supplies Java, Leiningen, Docker tooling, and the Supabase CLI.

## Dispatch payload

The current request is `v2-ci-requested`. Important top-level fields include:

```json
{
  "correlation_id": "greenways-ai/v2:<sha>:<run>:<attempt>",
  "source_repository": "greenways-ai/v2",
  "source_sha": "<exact-sha>",
  "source_ref": "feature/example",
  "source_run_url": "https://github.com/...",
  "source_run_id": 123,
  "source_run_attempt": 1,
  "pull_request_number": 42,
  "segments": {
    "gwdb_core": true,
    "gwdb_rpc": true,
    "docs": false
  },
  "metadata": {
    "schema_version": 2
  }
}
```

## Repository access

Cross-repository automation uses a secret named `GH_TOKEN`.

It must be able to:

- read the private `greenways-ai/v2` source revision
- read `zcaudate-xyz/foundation-base`
- pull the shared GHCR image
- receive dispatches from `greenways-ai/v2`
- write commit statuses on `greenways-ai/v2`

Prefer a GitHub App or fine-grained token restricted to the required
repositories and operations.

## Diagnostics

The backend job uploads available files from:

```text
foundation-base/foundation-install.log
v2/backend/lein-check.log
v2/backend/gwdb-core-test.log
v2/backend/gwdb-rpc-test.log
```

The docs job uploads:

```text
v2/docs-gen/npm-install.log
v2/docs-gen/docusaurus-build.log
v2/docs-gen/build/
```

Artifacts are retained for 14 days.

When investigating a backend failure, verify:

1. correlation ID
2. requested and resolved source SHA
3. Foundation SHA
4. shared image pull
5. `make deps-checkouts`
6. backend compilation
7. `gw-dev` scaffold startup
8. the failing namespace selector

## Legacy workflows

Obsolete monorepo workflows remain documented under:

```text
archive/workflows/legacy-v2-monorepo/
```

They referenced retired applications, package names, and deployment paths. Do
not restore them directly. The retired top-level `v2-gwdb.yml` and
`v2-docs.yml` workflows were superseded by `v2-ci.yml` and are not archived
because their job definitions now live in the combined workflow.

The following orphaned workflow files were removed from `.github/workflows`:

```text
_build-app.yml
_test-trpc.yml
web-main.yml
```

They appeared in the Actions workflow list as `_Build Application`, `_Test tRPC
Routers`, and `Publish Web Main`. They targeted the retired `gw-v2` monorepo
layout and were not part of the current segmented `v2` CI contract.

## Next stages

Recommended additions are:

1. segmented frontend install, typecheck, lint, Jest, and builds
2. deterministic generated SQL and API checks
3. package tarball readiness
4. protected staging deployment
5. production promotion of an already-tested artifact
6. rollback and credential-rotation procedures

Validation, publishing, and deployment credentials should remain separated.

## License

Private and proprietary to Greenways AI.
