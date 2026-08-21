/**
 * PS-1005 — a Studio preview session is shared across every app opened in
 * preview, so `session.accounts.saml2` can carry a login issued for another
 * app. The build script must only reuse a login that belongs to the app it is
 * running in, otherwise it redirects as if the user were signed in while the
 * API denies that app's data.
 *
 * Runnable standalone: `node tests/findAccountForApp.js`
 */

/* eslint-env node */
/* eslint-disable no-console */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {} };

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8'), sandbox);

const findAccountForApp = sandbox.window.FlipletLoginSAMLUtils.findAccountForApp;

const appA = { appId: 101, user: { email: 'a@x.z' } };
const appB = { appId: 202, user: { email: 'b@x.z' } };
const legacy = { user: { email: 'legacy@x.z' } };

const cases = [
  ['no SAML2 accounts at all', findAccountForApp([], [202]), undefined],
  ['only another app\'s login (the PS-1005 bug case)', findAccountForApp([appA], [202]), undefined],
  ['this app\'s own login', findAccountForApp([appB], [202]), appB],
  ['picks this app\'s login, not index 0', findAccountForApp([appA, appB], [202]), appB],
  ['matches the master app id', findAccountForApp([appA, appB], [999, 202]), appB],
  ['tolerates string app ids', findAccountForApp([appA, appB], ['202']), appB],
  ['ignores empty/undefined app ids', findAccountForApp([appA, appB], [null, undefined, '', 202]), appB],
  ['falls back to index 0 for pre-PS-1005 entries with no appId', findAccountForApp([legacy], [202]), legacy],
  ['falls back to index 0 when the app id is unknown', findAccountForApp([appA, appB], []), appA]
];

cases.forEach(function(testCase) {
  assert.strictEqual(testCase[1], testCase[2], testCase[0]);
  console.log('  ok — ' + testCase[0]);
});

console.log(cases.length + ' passing');
