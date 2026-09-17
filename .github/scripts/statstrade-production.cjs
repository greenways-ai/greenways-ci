'use strict';

// Trusted, read-only release eligibility checks. No provider credentials or
// source-controlled code are needed. The production job owns all mutations.
const SOURCE = Object.freeze({owner: 'statstrade-dev', repo: 'v2'});
const CI = Object.freeze({owner: 'greenways-ai', repo: 'greenways-ci'});
const REQUIRED_CONTEXTS = Object.freeze([
  'gwdb-core', 'gwdb-rpc', 'gwbuild', 'gwlink', 'backend-support',
  'gwlink-js', 'gwlink-dart', 'frontend', 'docs',
].map(name => `greenways-ci/${name}`));

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function validateInputs({sourceSha, runId, secretsRef}) {
  requireValue(typeof sourceSha === 'string' && /^[0-9a-f]{40}$/.test(sourceSha),
    'source_sha must be a full lowercase commit SHA.');
  requireValue(typeof runId === 'string' && /^[1-9][0-9]*$/.test(runId),
    'source_run_id must be a positive decimal run ID.');
  // Named configuration refs remain supported, but must be explicitly reviewed.
  requireValue(typeof secretsRef === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(secretsRef) &&
    !secretsRef.includes('..') && !secretsRef.includes('//') &&
    !secretsRef.split('/').some(part => !part || part.startsWith('.') ||
      part.endsWith('.') || part.endsWith('.lock')),
  'secrets_ref must be an exact SHA or a safe, approved configuration ref.');
}

async function compare(github, base, head) {
  const {data} = await github.rest.repos.compareCommitsWithBasehead({
    ...SOURCE, basehead: `${base}...${head}`, per_page: 1,
  });
  requireValue(data.base_commit?.sha === base &&
    ['ahead', 'identical'].includes(data.status),
  'Requested source is not an allowed main/prod descendant.');
}

async function verifyProductionSource({github, sourceSha, runId, secretsRef}) {
  validateInputs({sourceSha, runId, secretsRef});
  const {data: main} = await github.rest.git.getRef({...SOURCE, ref: 'heads/main'});
  requireValue(main.object?.type === 'commit' && /^[0-9a-f]{40}$/.test(main.object.sha),
    'Cannot resolve the exact source main commit.');
  // Snapshot the ref once; do not compare against a later moving main.
  await compare(github, sourceSha, main.object.sha);

  const statuses = await github.paginate(github.rest.repos.listCommitStatuses, {
    ...SOURCE, ref: sourceSha, per_page: 100,
  });
  const latest = new Map();
  // GitHub returns newest status first, including superseded failures.
  for (const status of statuses) {
    if (!latest.has(status.context)) latest.set(status.context, status.state);
  }
  const blocked = REQUIRED_CONTEXTS.filter(context => latest.get(context) !== 'success');
  requireValue(blocked.length === 0, `Missing or unsuccessful source checks: ${blocked.join(', ')}`);

  const {data: run} = await github.rest.actions.getWorkflowRun({...CI, run_id: runId});
  requireValue(String(run.id) === runId && run.repository?.full_name === 'greenways-ai/greenways-ci' &&
    run.path === '.github/workflows/v2-ci.yml' && run.event === 'repository_dispatch' &&
    run.head_branch === 'main' && run.status === 'completed' && run.conclusion === 'success',
  'Artifact run must be a successful trusted main v2-ci repository-dispatch run.');
  requireValue(Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0,
    'Artifact run has no valid attempt identity.');

  const artifactName = `statstrade-frontend-${sourceSha}`;
  const artifacts = await github.paginate(github.rest.actions.listWorkflowRunArtifacts, {
    ...CI, run_id: runId, per_page: 100,
  });
  const matching = artifacts.filter(artifact => artifact.name === artifactName);
  requireValue(matching.length === 1 && matching[0].expired === false &&
    matching[0].size_in_bytes > 0 && Number.isSafeInteger(matching[0].id) && matching[0].id > 0,
  'Expected exactly one non-expired immutable frontend artifact.');

  // Reject a backwards promotion BEFORE touching production, not after deploy.
  let prod;
  try {
    ({data: prod} = await github.rest.git.getRef({...SOURCE, ref: 'heads/prod'}));
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  if (prod) {
    requireValue(prod.object?.type === 'commit' && /^[0-9a-f]{40}$/.test(prod.object.sha),
      'Cannot resolve the current production commit.');
    await compare(github, prod.object.sha, sourceSha);
  }
  return {mainSha: main.object.sha, artifactId: matching[0].id,
    artifactName, runAttempt: String(run.run_attempt)};
}

function validateReleaseManifest(manifest, {sourceSha, runId, runAttempt, artifactSha256}) {
  requireValue(manifest && manifest.version === 1 && manifest.channel === 'next' &&
    manifest.hostname === 'next.statstrade.io', 'Artifact is not a next-channel release.');
  requireValue(manifest.sourceSha === sourceSha && manifest.runId === runId &&
    manifest.runAttempt === runAttempt, 'Release source/run/attempt identity does not match.');
  for (const field of ['netlifyDeployId', 'netlifySiteId']) {
    requireValue(typeof manifest[field] === 'string' && manifest[field].trim() !== '' &&
      manifest[field] !== 'null', `Release has no ${field} evidence.`);
  }
  requireValue(typeof manifest.artifactSha256 === 'string' &&
    /^[0-9a-f]{64}$/.test(manifest.artifactSha256) &&
    manifest.artifactSha256 === artifactSha256, 'Release archive digest does not match.');
  return manifest;
}

module.exports = {REQUIRED_CONTEXTS, validateInputs, verifyProductionSource, validateReleaseManifest};
