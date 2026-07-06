# greenways-ci

Central CI for Greenways AI repositories.

Source repositories send lightweight `repository_dispatch` notifications. Compilation and tests run here against the exact notified commit, following the same central-CI pattern used by `statstrade-dev/ci`.

## Greenways v2

The active `v2-gwdb.yml` workflow:

1. receives event `v2-changed`
2. checks out `greenways-ai/v2` at the supplied SHA
3. starts the local Supabase project
4. prepares the backend local environment
5. runs `lein check`
6. runs `lein test :in gwdb`
7. uploads diagnostic logs and writes a source-SHA summary

It also supports manual runs with a branch, tag, or commit.

## Dispatch contract

The source notification includes:

- source repository
- source event
- branch or ref
- exact commit SHA
- base branch and pull request number when applicable
- source workflow run ID

The exact commit SHA is the synchronization contract between `greenways-ai/v2` and this repository.

## Repository access

The source repository needs a narrowly scoped credential that can dispatch to this repository. This repository needs a narrowly scoped credential that can read `greenways-ai/v2`. Both workflows currently refer to that credential as `GH_TOKEN`.

## Legacy workflows

The previous workflows targeted obsolete apps, package names, and deployment paths. Their file list and retirement rationale are recorded under `archive/workflows/legacy-v2-monorepo/`; the complete versions remain available in Git history.

New frontend, publishing, and deployment stages should be added only after their commands are verified against the current v2 repository layout.
