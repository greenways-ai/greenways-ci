# Greenways CI

`greenways-ai/greenways-ci` runs central validation and documentation jobs for
`greenways-ai/v2`. The source repository sends one correlated
`v2-ci-requested` event containing the exact source SHA and requested segments.

## V2 workflow

The active workflow is:

```text
.github/workflows/v2-ci.yml
```

One correlated run contains independently visible jobs:

```text
gwdb.core pipeline
gwdb.rpc pipeline
Docusaurus pipeline
```

This follows the segmented style of `foundation-base/run-test.yml`: each test
segment has its own result, log artifact, status context, and rerun control.

## Database segments

Both database jobs call the shared runner:

```text
.github/workflows/_v2-gwdb-segment.yml
```

The runner checks out the exact v2 revision, resolves the Foundation gitlink
from that revision, installs the pinned Foundation modules, runs `lein check`,
and then runs one selector:

```bash
lein test :in gwdb.core
lein test :in gwdb.rpc
```

Core changes request both jobs because RPC definitions depend on core database
types and functions. RPC-only changes request only the RPC job. Shared backend,
scaffold, generator, configuration, dependency, or project changes request
both.

The source contexts are:

```text
greenways-ci/gwdb-core
greenways-ci/gwdb-rpc
```

## Docusaurus Pages

The documentation job builds `v2/docs-gen`, verifies the generated Docusaurus
application, and uploads only:

```text
v2/docs-gen/build
```

It does not upload the repository `docs/` directory or a branch checkout as a
Pages artifact. The deployment job requires Settings > Pages > Source to be
**GitHub Actions** before `actions/deploy-pages` can publish.

The source context is:

```text
greenways-ci/docs
```

## Correlation

Every source request includes:

```text
<source-repository>:<source-sha>:<source-run-id>:<source-run-attempt>
```

Selected jobs preserve that correlation and link source statuses to the exact
central run.

## Diagnostics

Database jobs retain Foundation installation, backend compilation, and
segment-specific test logs. The documentation job retains dependency, build,
and generated-site output for 14 days.

## License

Private and proprietary to Greenways AI.
