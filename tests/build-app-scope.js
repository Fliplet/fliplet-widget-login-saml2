/**
 * PS-1005 — end-to-end regression for the widget's own returning-session path.
 *
 * tests/findAccountForApp.js covers the selection helper in isolation; this
 * runs js/build.js itself against stubbed Fliplet APIs and asserts what the
 * user actually experiences: whether the widget silently redirects past the
 * login screen or leaves the login button in place.
 *
 * The failure this guards against is the whole point of PS-1005: with an App A
 * SAML2 session, previewing App B used to redirect as if the user were signed
 * in, and the API then denied App B's data — denied or looping, with no way to
 * authenticate into App B.
 *
 * Runnable standalone: `node tests/build-app-scope.js`
 */

/* eslint-env node */
/* eslint-disable no-console */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const UTILS = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');
const BUILD = fs.readFileSync(path.join(__dirname, '../js/build.js'), 'utf8');

const APP_A = 101;
const APP_B = 202;
const BUTTON_LABEL = 'Sign in';

/**
 * Runs js/build.js once against stubbed Fliplet APIs and reports what it did.
 *
 * @param {Object} scenario - { preview, appId, masterAppId, saml2Accounts }
 * @returns {Promise<Object>} { navigatedTo, profile, buttonLabel, errorShown }
 */
function runWidget(scenario) {
  const result = { navigatedTo: undefined, profile: undefined, errorShown: false };

  // Minimal jQuery stand-in: the widget only reads/writes the button label and
  // toggles classes, so tracking the label is enough to tell "showing the login
  // button" from "redirecting".
  let buttonLabel = BUTTON_LABEL;

  const $el = {
    text: function(value) {
      if (value === undefined) {
        return buttonLabel;
      }

      buttonLabel = value;

      return $el;
    },
    addClass: function() { return $el; },
    removeClass: function() { return $el; },
    html: function() {
      result.errorShown = true;

      return $el;
    },
    click: function() { return $el; },
    translate: function() { return $el; },
    fadeIn: function() { return $el; }
  };

  let instanceCallback;

  const Fliplet = function() {
    return Promise.resolve();
  };

  Fliplet.Widget = {
    instance: function(name, callback) { instanceCallback = callback; },
    get: function() { return undefined; }
  };
  Fliplet.Env = {
    get: function(key) {
      switch (key) {
        case 'preview': return scenario.preview;
        case 'appId': return scenario.appId;
        case 'masterAppId': return scenario.masterAppId;
        case 'organizationId': return 1;
        default: return undefined;
      }
    }
  };
  Fliplet.Session = {
    get: function() {
      return Promise.resolve({ accounts: { saml2: scenario.saml2Accounts } });
    }
  };
  Fliplet.Profile = {
    set: function(profile) {
      result.profile = profile;

      return Promise.resolve();
    }
  };
  Fliplet.Hooks = { run: function() { return Promise.resolve(); } };

  Fliplet.Navigate = {
    to: function(action) {
      result.navigatedTo = action;

      return Promise.resolve();
    }
  };
  Fliplet.User = { getAuthToken: function() { return 'eu--session--token'; } };

  Fliplet.parseError = function(err) { return String(err); };

  Fliplet.UI = { Toast: function() { return Promise.resolve({ dismiss: function() {} }); } };

  const sandbox = {
    Fliplet: Fliplet,
    $: function() { return $el; },
    T: function(key) { return key; },
    Promise: Promise,
    setTimeout: setTimeout,
    console: { log: function() {}, warn: function() {}, error: function() {} }
  };

  vm.createContext(sandbox);
  // js/utils.js publishes on `window`, which build.js then reads as a bare
  // global — in a browser those are the same object, so make them the same here.
  sandbox.window = sandbox;
  vm.runInContext(UTILS, sandbox);
  vm.runInContext(BUILD, sandbox);

  instanceCallback.call($el, { redirectAction: { page: 'secured' } });

  // Let the session promise chain settle before reporting.
  return new Promise(function(resolve) {
    setTimeout(function() {
      result.buttonLabel = buttonLabel;
      resolve(result);
    }, 25);
  });
}

function account(appId, email) {
  return { appId: appId, email: email, user: { id: email, email: email } };
}

const scenarios = [
  {
    name: 'previewing App B with only App A\'s SAML2 session shows the login button',
    scenario: { preview: true, appId: APP_B, masterAppId: APP_B, saml2Accounts: [account(APP_A, 'a@x.z')] },
    expect: function(r) {
      assert.strictEqual(r.navigatedTo, undefined, 'must not redirect past the login screen');
      assert.strictEqual(r.profile, undefined, 'must not adopt the other app\'s profile');
      assert.strictEqual(r.buttonLabel, BUTTON_LABEL, 'login button must be usable');
      assert.strictEqual(r.errorShown, false, 'no error banner — this is the normal logged-out state');
    }
  },
  {
    name: 'previewing App B with logins for both apps redirects as App B\'s user',
    scenario: {
      preview: true, appId: APP_B, masterAppId: APP_B,
      saml2Accounts: [account(APP_A, 'a@x.z'), account(APP_B, 'b@x.z')]
    },
    expect: function(r) {
      assert.deepStrictEqual(r.navigatedTo, { page: 'secured' }, 'must redirect');
      assert.strictEqual(r.profile.email, 'b@x.z', 'must use App B\'s identity, not entry 0');
    }
  },
  {
    name: 'previewing App B with its own login redirects',
    scenario: { preview: true, appId: APP_B, masterAppId: APP_B, saml2Accounts: [account(APP_B, 'b@x.z')] },
    expect: function(r) {
      assert.deepStrictEqual(r.navigatedTo, { page: 'secured' });
      assert.strictEqual(r.profile.email, 'b@x.z');
    }
  },
  {
    name: 'matches on the master app id when the previewed app id differs',
    scenario: { preview: true, appId: 9999, masterAppId: APP_B, saml2Accounts: [account(APP_B, 'b@x.z')] },
    expect: function(r) {
      assert.deepStrictEqual(r.navigatedTo, { page: 'secured' });
    }
  },
  {
    name: 'outside preview a returning user is redirected as before (PS-1342 portal session)',
    scenario: { preview: false, appId: APP_B, masterAppId: APP_B, saml2Accounts: [account(APP_A, 'a@x.z')] },
    expect: function(r) {
      assert.deepStrictEqual(r.navigatedTo, { page: 'secured' }, 'published apps must keep the old behaviour');
      assert.strictEqual(r.profile.email, 'a@x.z');
    }
  },
  {
    name: 'entries from an API without appId still redirect (deploy-order safety)',
    scenario: {
      preview: true, appId: APP_B, masterAppId: APP_B,
      saml2Accounts: [{ email: 'legacy@x.z', user: { id: 'legacy@x.z', email: 'legacy@x.z' } }]
    },
    expect: function(r) {
      assert.deepStrictEqual(r.navigatedTo, { page: 'secured' }, 'must not lock out users if the widget ships first');
    }
  },
  {
    name: 'an empty SAML2 session shows the login button',
    scenario: { preview: true, appId: APP_B, masterAppId: APP_B, saml2Accounts: [] },
    expect: function(r) {
      assert.strictEqual(r.navigatedTo, undefined);
      assert.strictEqual(r.buttonLabel, BUTTON_LABEL);
    }
  }
];

scenarios.reduce(function(chain, testCase) {
  return chain.then(function() {
    return runWidget(testCase.scenario).then(function(r) {
      testCase.expect(r);
      console.log('  ok — ' + testCase.name);
    });
  });
}, Promise.resolve()).then(function() {
  console.log(scenarios.length + ' passing');
}).catch(function(err) {
  console.error('  FAILED — ' + err.message);
  process.exitCode = 1;

  throw err;
});
