# V2 documentation publishing

The `Greenways v2 CI` workflow builds `greenways-ai/v2/docs-gen` from the exact
source revision supplied by a `v2-ci-requested` repository-dispatch event.
Documentation is a conditional job inside the shared central run, rather than a
separate top-level workflow.

- Pull-request and feature-branch dispatches build and upload diagnostics and an artifact for review.
- A dispatch for `main` builds and publishes the site to the `greenways-ci` GitHub Pages environment.
- Manual dispatch can independently enable documentation and publishing.
- Backend-only requests do not allocate a documentation runner.

The retired `Publish Web Main` workflow is unrelated to documentation
publishing and has been removed with the old application and tRPC reusable
workflows.

Required repository configuration:

1. `GH_TOKEN` must be able to read the private `greenways-ai/v2` repository.
2. GitHub Pages must use GitHub Actions as its source.
3. The `github-pages` environment may require reviewer approval if desired.

The Docusaurus site links each page back to its source in `greenways-ai/v2`,
while plan approval remains recorded in the source pull request.
