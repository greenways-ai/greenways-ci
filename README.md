# Greenways CI

`greenways-ai/greenways-ci` runs central validation for exact revisions of
`greenways-ai/v2`. The source repository sends one correlated
`v2-ci-requested` event with schema version 3 and the affected slices.

## V2 slices

The active `.github/workflows/v2-ci.yml` orchestrator exposes independently
rerunnable jobs and source commit statuses for:

```text
gwdb.core
gwdb.rpc
gwbuild and generated-artifact reproducibility
gwlink
backend support namespaces
gwlink JavaScript build
gwlink Dart build
main Yarn/Turbo frontend
Docusaurus
```

Backend jobs use `_v2-backend-segment.yml`; generated-language builds use
`_v2-language-build.yml`; frontend and documentation have dedicated reusable
runners. Every runner checks out the notified V2 SHA. Backend and language
jobs additionally resolve and install the Foundation revision pinned by that
SHA.

Pull requests and `develop` pushes are selected by the V2 source detector.
Every `main` push and manual full run requests all slices. Unaffected source
contexts are marked successful without starting central jobs.

## Generated artifacts

The `gwbuild` slice runs the canonical RPC, link and SQL generators and fails
if tracked generated output differs. This protects the sequence:

```text
source definition -> generator -> tracked artifact -> consumer build
```

## Diagnostics

Each selected job retains its focused logs or build output for 14 days and
links the final source status to the correlated central run.

## License

Private and proprietary to Greenways AI.
