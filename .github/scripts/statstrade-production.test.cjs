'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {REQUIRED_CONTEXTS, validateInputs, verifyProductionSource, validateReleaseManifest} =
  require('./statstrade-production.cjs');

const sourceSha = 'a'.repeat(40);
const mainSha = 'b'.repeat(40);
const prodSha = 'c'.repeat(40);
const input = {sourceSha, runId: '123', secretsRef: 'main'};
function fixture() {
  const state = {
    statuses: REQUIRED_CONTEXTS.map(context => ({context, state: 'success'})),
    run: {id: 123, repository: {full_name: 'greenways-ai/greenways-ci'},
      path: '.github/workflows/v2-ci.yml', event: 'repository_dispatch', head_branch: 'main',
      status: 'completed', conclusion: 'success', run_attempt: 1},
    artifacts: [{id: 456, name: `statstrade-frontend-${sourceSha}`, expired: false, size_in_bytes: 42}],
    mainStatus: 'ahead', prodStatus: 'ahead', calls: [],
  };
  const github = {rest: {
    git: {getRef: async args => {
      state.calls.push(args);
      assert.equal(args.owner, 'statstrade-dev');
      assert.equal(args.repo, 'v2');
      if (args.ref === 'heads/prod' && state.prodError) throw state.prodError;
      return {data: {object: {type: 'commit', sha: args.ref === 'heads/main' ? mainSha : prodSha}}};
    }},
    repos: {
      compareCommitsWithBasehead: async args => {
        state.calls.push(args);
        assert.equal(args.owner, 'statstrade-dev');
        const [base, head] = args.basehead.split('...');
        assert.equal(head, base === sourceSha ? mainSha : sourceSha);
        return {data: {base_commit: {sha: base}, status: base === sourceSha ? state.mainStatus : state.prodStatus}};
      },
      listCommitStatuses: async args => {
        assert.equal(args.ref, sourceSha);
        return state.statuses;
      },
    },
    actions: {
      getWorkflowRun: async args => {
        assert.equal(args.owner, 'greenways-ai');
        assert.equal(args.repo, 'greenways-ci');
        assert.equal(args.run_id, '123');
        return {data: state.run};
      },
      listWorkflowRunArtifacts: async args => {
        assert.equal(args.run_id, '123');
        return state.artifacts;
      },
    },
  }, paginate: async (method, args) => method(args)};
  return {state, github};
}

test('accepts verified source and returns exact artifact/attempt identity', async () => {
  const {github} = fixture();
  assert.deepEqual(await verifyProductionSource({github, ...input}), {
    mainSha, artifactId: 456, artifactName: `statstrade-frontend-${sourceSha}`, runAttempt: '1',
  });
});
for (const key of ['sourceSha', 'runId', 'secretsRef']) {
  test(`rejects malformed ${key} before any API access`, () => {
    assert.throws(() => validateInputs({...input, [key]: 'bad\ninjected'}));
  });
}
test('accepts exact configuration SHA', () => validateInputs({...input, secretsRef: 'd'.repeat(40)}));
for (const secretsRef of ['../main', 'main.lock', 'heads//main', 'main/../other', 'main/']) {
  test(`rejects unsafe configuration ref ${secretsRef}`, () => {
    assert.throws(() => validateInputs({...input, secretsRef}));
  });
}
for (const mainStatus of ['behind', 'diverged']) {
  test(`rejects source not on main: ${mainStatus}`, async () => {
    const {github, state} = fixture();
    state.mainStatus = mainStatus;
    await assert.rejects(verifyProductionSource({github, ...input}), /descendant/);
  });
}
for (const status of ['pending', 'failure', 'error', undefined]) {
  test(`rejects source context ${status ?? 'missing'}`, async () => {
    const {github, state} = fixture();
    if (status) state.statuses[0].state = status;
    else state.statuses.shift();
    await assert.rejects(verifyProductionSource({github, ...input}), /source checks/);
  });
}
test('superseded failure does not override latest success', async () => {
  const {github, state} = fixture();
  state.statuses.push({context: REQUIRED_CONTEXTS[0], state: 'failure'});
  await verifyProductionSource({github, ...input});
});
for (const patch of [
  {conclusion: 'failure'}, {status: 'in_progress'}, {event: 'pull_request'},
  {head_branch: 'feature'}, {path: '.github/workflows/other.yml'},
  {repository: {full_name: 'other/ci'}}, {id: 999}, {run_attempt: 0},
]) {
  test(`rejects untrusted or unsuccessful artifact run ${JSON.stringify(patch)}`, async () => {
    const {github, state} = fixture();
    Object.assign(state.run, patch);
    await assert.rejects(verifyProductionSource({github, ...input}));
  });
}
for (const mode of ['missing', 'expired', 'empty', 'duplicate']) {
  test(`rejects ${mode} artifact`, async () => {
    const {github, state} = fixture();
    if (mode === 'missing') state.artifacts = [];
    if (mode === 'expired') state.artifacts[0].expired = true;
    if (mode === 'empty') state.artifacts[0].size_in_bytes = 0;
    if (mode === 'duplicate') state.artifacts.push({...state.artifacts[0], id: 457});
    await assert.rejects(verifyProductionSource({github, ...input}), /immutable frontend artifact/);
  });
}
test('backwards production promotion is rejected before deployment', async () => {
  const {github, state} = fixture();
  state.prodStatus = 'behind';
  await assert.rejects(verifyProductionSource({github, ...input}), /descendant/);
});
test('missing prod is allowed but authorization failures are not', async () => {
  const {github, state} = fixture();
  state.prodError = Object.assign(new Error('not found'), {status: 404});
  await verifyProductionSource({github, ...input});
  state.prodError.status = 403;
  await assert.rejects(verifyProductionSource({github, ...input}), /not found/);
});

const artifactSha256 = 'e'.repeat(64);
const release = {version: 1, channel: 'next', hostname: 'next.statstrade.io',
  sourceSha, runId: '123', runAttempt: '1', netlifyDeployId: 'deploy',
  netlifySiteId: 'site', artifactSha256};
const expected = {...input, runAttempt: '1', artifactSha256};
test('validates next artifact identity and digest', () => {
  assert.equal(validateReleaseManifest(release, expected), release);
});
for (const patch of [
  {version: 2}, {channel: 'production'}, {hostname: 'other.example'},
  {sourceSha: mainSha}, {runId: '456'}, {runAttempt: '2'},
  {netlifyDeployId: 'null'}, {netlifySiteId: ''}, {artifactSha256: 'f'.repeat(64)},
]) {
  test(`rejects mismatched release evidence ${JSON.stringify(patch)}`, () => {
    assert.throws(() => validateReleaseManifest({...release, ...patch}, expected));
  });
}
test('production wiring preserves exact-source, protected no-build deployment', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '../workflows/statstrade-production.yml'), 'utf8');
  assert.match(workflow, /environment: statstrade-production/);
  assert.match(workflow, /if: github.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /repository: statstrade-dev\/v2/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(workflow, /git fetch origin main/);
  assert.ok(workflow.indexOf('verifyProductionSource') < workflow.indexOf('Configure dot-secrets deploy key'));
  assert.ok(workflow.indexOf('validateReleaseManifest') < workflow.indexOf('Configure dot-secrets deploy key'));
  assert.match(workflow, /deploy --no-build --prod/);
  assert.match(workflow, /--dir \.netlify\/static --functions \.netlify\/functions/);
  assert.match(workflow, /cp main\/js\/apps\/statstrade\/netlify.toml netlify.toml/);
  assert.doesNotMatch(workflow, /yarn (install|build)|npm (install|run build)/);
  assert.match(workflow, /force: false/);
});
