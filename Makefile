# Greenways CI - Makefile
# Provides convenient commands for triggering workflows

.PHONY: deploy deploy-staging deploy-prod list runs

# Deploy to staging environment (default)
deploy:
	gh workflow run web-main.yml --repo greenways-ai/greenways-ci

# Deploy to staging environment (explicit)
deploy-staging:
	gh workflow run web-main.yml --repo greenways-ai/greenways-ci -f environment=staging

# Deploy to production environment
deploy-prod:
	gh workflow run web-main.yml --repo greenways-ai/greenways-ci -f environment=production

# List available workflows
list:
	gh workflow list --repo greenways-ai/greenways-ci

# View workflow runs
runs:
	gh run list --repo greenways-ai/greenways-ci
