# Business-plan PDF publishing

The v2 documentation pipeline builds the LaTeX sources under `docs/business-plan` before building Docusaurus.

Generated PDFs are copied into Docusaurus's static tree:

```text
docs-gen/static/documents/business-plan/business-plan.pdf
docs-gen/static/documents/business-plan/case-studies/*.pdf
```

Docusaurus includes these files in the published site under:

```text
/greenways-ci/documents/business-plan/business-plan.pdf
/greenways-ci/documents/business-plan/case-studies/<case-study>.pdf
```

The CI job verifies both the source-side copies and the corresponding files in `docs-gen/build` before the GitHub Pages artifact is uploaded.
