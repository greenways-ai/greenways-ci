# Greenways CI

`greenways-ai/greenways-ci` is the central execution repository for Greenways
AI projects. Source repositories publish lightweight, correlated requests;
this repository checks out exact source revisions and runs validation,
publishing, or deployment workflows.

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
  +--> segmented gwdb validation
  +--> documentation build and Pages publishing
  +--> diagnostics and run summaries
  +--> source status updates linked to central runs
```

The source SHA is the synchronization contract. Central workflows must not
replace a supplied SHA with a moving branch.

## Active workflows

### Segmented v2 gwdb

Workflow: `.github/workflows/v2-gwdb.yml`

The workflow accepts:

- `repository_dispatch` event `v2-ci-requested`
- legacy `v2-changed` events during migration
- manual dispatch with independent core and RPC flags
- pull requests that change the central workflow

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

Workflow: `.github/workflows/v2-docs.yml`

The docs workflow runs only when the dispatch requests the docs segment.
It builds the exact source SHA, uploads the Docusaurus output, and publishes
GitHub Pages only when the source ref is `main`.

The source context is:

```text
greenways-ci/docs
```

Manual dispatch accepts both a source ref and an explicit publish flag.

## Correlation

Every v2 dispatch has a correlation ID:

```text
<source-repository>:<source-sha>:<source-run-id>:<source-run-attempt>
```

The request carries the exact source SHA, source workflow URL and identifiers,
pull-request metadata, a bounded changed-file sample, and requested segments.
Extended metadata is nested to remain within GitHub's limit of ten top-level
`client_payload` properties.

Central run summaries include the same correlation ID. Source statuses link
directly to the corresponding central run, allowing navigation in both
directions:

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

The shared CI container mounts the workspace at the same absolute path,
mounts the Docker socket, and uses host networking so the scaffold can manage
its bundled services.

## Dependency checkout convention

`v2` owns dependency wiring:

```bash
cd v2
make deps-checkouts
```

Central CI checks out dependency repositories beside the project. The project
creates its own Leiningen `checkouts/` links. Central workflows must not
rewrite `project.clj` or add repository-specific source paths.

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

The backend workflow uploads available files from:

```text
v2/backend/lein-check.log
v2/backend/gwdb-core-test.log
v2/backend/gwdb-rpc-test.log
```

Artifacts are retained for 14 days.

When investigating a failure, verify:

1. correlation ID
2. requested and resolved source SHA
3. Foundation SHA
4. shared image pull
5. `make deps-checkouts`
6. backend compilation
7. `gw-dev` scaffold startup
8. the failing namespace selector

## Legacy workflows

The obsolete monorepo workflows remain documented under:

```text
archive/workflows/legacy-v2-monorepo/
```

They referenced retired applications, package names, and deployment paths.
Do not restore them directly.

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
