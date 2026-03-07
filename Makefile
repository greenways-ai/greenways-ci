# Greenways CI - Makefile
# Provides convenient commands for triggering workflows

.PHONY: deploy deploy-staging deploy-prod list runs \
        hunter-rag hunter-rag-staging hunter-rag-prod hunter-rag-test \
        hunter-rag-e2e hunter-rag-list hunter-rag-runs

# =============================================================================
# Web Deployments
# =============================================================================

# Deploy to staging environment (default)
deploy:
	gh workflow run web-main.yml --repo greenways-ai/greenways-ci

# Deploy to staging environment (explicit)
deploy-staging:
	gh workflow run web-main.yml --repo greenways-ai/greenways-ci -f environment=staging

# Deploy to production environment
deploy-prod:
	gh workflow run web-main.yml --repo greenways-ai/greenways-ci -f environment=production

# =============================================================================
# Hunter-RAG CI/CD
# =============================================================================

# Run Hunter-RAG CI with defaults (staging, no E2E)
hunter-rag:
	gh workflow run hunter-rag-ci.yml --repo greenways-ai/greenways-ci

# Run Hunter-RAG CI for staging
hunter-rag-staging:
	gh workflow run hunter-rag-ci.yml --repo greenways-ai/greenways-ci \
		-f environment=staging -f run-tests=true -f run-e2e=false -f deploy=true

# Run Hunter-RAG CI for production
hunter-rag-prod:
	gh workflow run hunter-rag-ci.yml --repo greenways-ai/greenways-ci \
		-f environment=production -f run-tests=true -f run-e2e=true -f deploy=true

# Run Hunter-RAG tests only (no deploy)
hunter-rag-test:
	gh workflow run hunter-rag-ci.yml --repo greenways-ai/greenways-ci \
		-f environment=staging -f run-tests=true -f run-e2e=false -f deploy=false

# Run Hunter-RAG with E2E tests
hunter-rag-e2e:
	gh workflow run hunter-rag-ci.yml --repo greenways-ai/greenways-ci \
		-f environment=staging -f run-tests=true -f run-e2e=true -f deploy=true

# List Hunter-RAG workflow runs
hunter-rag-runs:
	gh run list --repo greenways-ai/greenways-ci --workflow=hunter-rag-ci.yml

# =============================================================================
# General Commands
# =============================================================================

# List available workflows
list:
	gh workflow list --repo greenways-ai/greenways-ci

# View workflow runs
runs:
	gh run list --repo greenways-ai/greenways-ci
