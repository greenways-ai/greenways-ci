# Greenways CI - Makefile
# Provides convenient commands for triggering workflows

.PHONY: deploy-test deploy-prod

# Deploy to test environment (Vercel + Netlify)
deploy-test:
	gh workflow run web-main.yml --repo greenways-ai/greenways-ci

# Deploy to production environment (Vercel + Netlify)
deploy-prod:
	gh workflow run web-prod.yml --repo greenways-ai/greenways-ci

# List available workflows
list:
	gh workflow list --repo greenways-ai/greenways-ci

# View workflow runs
runs:
	gh run list --repo greenways-ai/greenways-ci
