# Greenways CI - Makefile
# Convenience commands for active workflows

.PHONY: list runs watch

# List available workflows
list:
	gh workflow list --repo greenways-ai/greenways-ci

# View workflow runs
runs:
	gh run list --repo greenways-ai/greenways-ci

# Watch the latest run
watch:
	gh run watch --repo greenways-ai/greenways-ci
