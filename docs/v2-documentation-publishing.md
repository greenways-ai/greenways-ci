# V2 documentation publishing

The `Greenways v2 CI` workflow builds `greenways-ai/v2/docs-gen` from the exact
source revision supplied by a `v2-ci-requested` repository-dispatch event.
Documentation and the Statstrade Build Portal are a conditional job inside the
shared central run, rather than a separate top-level workflow.

- Pull-request dispatches build, upload diagnostics, and deploy a Netlify preview.
- A dispatch for `main` builds and publishes the combined portal and `/docs/` site to Netlify.
- Manual dispatch can independently enable documentation and publishing.
- Backend-only requests do not allocate a documentation runner.

The retired `Publish Web Main` workflow is unrelated to documentation
publishing and has been removed with the old `_Build Application` and `_Test
tRPC Routers` reusable workflows.

Required repository configuration:

1. `GH_TOKEN` must be able to read the private `greenways-ai/v2` repository.
2. `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` must be configured in the
   `build-portal-preview` and `build-portal-production` environments.
3. The production environment may require reviewer approval if desired.

The Docusaurus site is served from `https://build.statstrade.io/docs/` and links
each page back to its source in `greenways-ai/v2`, while plan approval remains
recorded in the source pull request. GitHub Pages is retained only as a
temporary migration fallback.
