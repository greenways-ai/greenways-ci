# V2 documentation publishing

The `V2 Documentation` workflow builds `greenways-ai/v2/docs-gen` from the exact source revision supplied by the existing `v2-changed` repository-dispatch event.

- Pull-request and feature-branch dispatches build and upload an artifact for review.
- A dispatch for `main` builds and publishes the site to the `greenways-ci` GitHub Pages environment.
- Manual dispatch is available for validation or recovery.

Required repository configuration:

1. `GH_TOKEN` must be able to read the private `greenways-ai/v2` repository.
2. GitHub Pages must use GitHub Actions as its source.
3. The `github-pages` environment may require reviewer approval if desired.

The Docusaurus site links each page back to its source in `greenways-ai/v2`, while plan approval remains recorded in the source pull request.
