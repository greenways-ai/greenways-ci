# Greenways CI - active workflow helpers

.PHONY: list runs watch run-core run-rpc run-docs publish-docs

list:
	gh workflow list --repo greenways-ai/greenways-ci

runs:
	gh run list --repo greenways-ai/greenways-ci

watch:
	gh run watch --repo greenways-ai/greenways-ci

run-core:
	gh workflow run v2-ci.yml --repo greenways-ai/greenways-ci -f source_ref=main -f run_core=true -f run_rpc=false -f run_docs=false -f publish_docs=false

run-rpc:
	gh workflow run v2-ci.yml --repo greenways-ai/greenways-ci -f source_ref=main -f run_core=false -f run_rpc=true -f run_docs=false -f publish_docs=false

run-docs:
	gh workflow run v2-ci.yml --repo greenways-ai/greenways-ci -f source_ref=main -f run_core=false -f run_rpc=false -f run_docs=true -f publish_docs=false

publish-docs:
	gh workflow run v2-ci.yml --repo greenways-ai/greenways-ci -f source_ref=main -f run_core=false -f run_rpc=false -f run_docs=true -f publish_docs=true
