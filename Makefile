.PHONY: list runs watch run-all run-core run-rpc run-gwbuild run-gwlink run-js run-dart run-frontend run-docs publish-docs

WORKFLOW := v2-ci.yml
REPO := greenways-ai/greenways-ci
BASE := gh workflow run $(WORKFLOW) --repo $(REPO) -f source_ref=main
OFF := -f run_core=false -f run_rpc=false -f run_gwbuild=false -f run_gwlink=false -f run_backend_support=false -f run_js=false -f run_dart=false -f run_frontend=false -f run_docs=false

list:
	gh workflow list --repo $(REPO)

runs:
	gh run list --repo $(REPO)

watch:
	gh run watch --repo $(REPO)

run-all:
	$(BASE)

run-core:
	$(BASE) $(OFF) -f run_core=true

run-rpc:
	$(BASE) $(OFF) -f run_rpc=true

run-gwbuild:
	$(BASE) $(OFF) -f run_gwbuild=true

run-gwlink:
	$(BASE) $(OFF) -f run_gwlink=true

run-js:
	$(BASE) $(OFF) -f run_js=true

run-dart:
	$(BASE) $(OFF) -f run_dart=true

run-frontend:
	$(BASE) $(OFF) -f run_frontend=true

run-docs:
	$(BASE) $(OFF) -f run_docs=true -f publish_docs=false

publish-docs:
	$(BASE) $(OFF) -f run_docs=true -f publish_docs=true
