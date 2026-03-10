# Greenways CI - Makefile
# Provides convenient commands for triggering workflows

.PHONY: list runs ci ci-staging ci-prod ci-test ci-e2e \
        deploy-spaces deploy-vibe deploy-ragtrain \
        storybook storybook-chromatic \
        packages-publish packages-publish-now

# =============================================================================
# General Commands
# =============================================================================

# List available workflows
list:
	gh workflow list --repo greenways-ai/greenways-ci

# View workflow runs
runs:
	gh run list --repo greenways-ai/greenways-ci

# Watch the latest run
watch:
	gh run watch --repo greenways-ai/greenways-ci

# =============================================================================
# Main CI/CD Pipeline (ci-cd.yml)
# =============================================================================

# Run CI/CD with defaults (all apps, staging)
ci:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci

# Run CI/CD for staging (build + test, no deploy)
ci-staging:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f environment=staging -f run-tests=true -f run-e2e=false -f deploy=false

# Run CI/CD for production (full pipeline with E2E and deploy)
ci-prod:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f environment=production -f run-tests=true -f run-e2e=true -f deploy=true

# Run tests only (no deploy)
ci-test:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f environment=staging -f run-tests=true -f run-e2e=false -f deploy=false

# Run with E2E tests
ci-e2e:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f environment=staging -f run-tests=true -f run-e2e=true -f deploy=false

# Run specific app only
ci-spaces:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f apps=gw-spaces -f run-tests=true -f run-e2e=true

ci-vibe:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f apps=gw-vibe-engine -f run-tests=true -f run-e2e=false

ci-ragtrain:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f apps=gw-ragtrain -f run-tests=false -f run-e2e=false

# =============================================================================
# Deployments
# =============================================================================

# Deploy specific apps
deploy-spaces:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f apps=gw-spaces -f deploy=true -f environment=staging

deploy-vibe:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f apps=gw-vibe-engine -f deploy=true -f environment=staging

deploy-ragtrain:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f apps=gw-ragtrain -f deploy=true -f environment=staging

# Deploy all to production
deploy-prod:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f apps=all -f deploy=true -f environment=production

# =============================================================================
# Storybook
# =============================================================================

# Deploy Storybook to Chromatic
storybook-chromatic:
	gh workflow run ci-cd.yml --repo greenways-ai/greenways-ci \
		-f deploy-storybook=true -f run-tests=false

# =============================================================================
# Package Publishing
# =============================================================================

# Publish packages to npm (dry run by default)
packages-publish:
	gh workflow run gw-publish-packages.yml --repo greenways-ai/greenways-ci

# Actually publish packages
packages-publish-now:
	gh workflow run gw-publish-packages.yml --repo greenways-ai/greenways-ci \
		-f dry-run=false

# =============================================================================
# Legacy Web Deployments (web-main.yml)
# =============================================================================

# Deploy web to staging (legacy)
web-deploy:
	gh workflow run web-main.yml --repo greenways-ai/greenways-ci

# Deploy web to staging (explicit)
web-deploy-staging:
	gh workflow run web-main.yml --repo greenways-ai/greenways-ci -f environment=staging

# Deploy web to production
web-deploy-prod:
	gh workflow run web-main.yml --repo greenways-ai/greenways-ci -f environment=production
