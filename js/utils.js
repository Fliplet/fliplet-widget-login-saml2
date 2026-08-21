/**
 * Gets a nested property from an object using a path string
 * @param {Object} obj - The object to get the property from
 * @param {string} path - The path to the property (e.g., 'user.email')
 * @param {*} defaultValue - The default value if the property doesn't exist
 * @returns {*} The property value or default value
 */
function get(obj, path, defaultValue) {
  if (!obj || !path) return defaultValue;
  
  var keys = path.split('.');
  var result = obj;
  
  for (var i = 0; i < keys.length; i++) {
    if (result == null || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[keys[i]];
  }
  
  return result !== undefined ? result : defaultValue;
}

/**
 * Creates a new object with only the specified properties
 * @param {Object} obj - The source object
 * @param {string[]} keys - Array of keys to pick
 * @returns {Object} New object with only the picked properties
 */
function pick(obj, keys) {
  if (!obj || !keys || !keys.length) return {};
  
  var result = {};
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Assigns properties from source objects to target object
 * @param {Object} target - The target object
 * @param {...Object} sources - The source objects
 * @returns {Object} The target object
 */
function assignIn(target) {
  if (!target || typeof target !== 'object') return target;
  
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];
    if (source && typeof source === 'object') {
      for (var key in source) {
        if (source.hasOwnProperty(key)) {
          target[key] = source[key];
        }
      }
    }
  }
  return target;
}

/**
 * Tests whether at least one element in the array passes the test
 * @param {Array} array - The array to iterate over
 * @param {Function} predicate - The function invoked per iteration
 * @returns {boolean} Returns true if any element passes the predicate check, else false
 */
function some(array, predicate) {
  if (!array || !array.length || typeof predicate !== 'function') return false;
  
  for (var i = 0; i < array.length; i++) {
    if (predicate(array[i], i, array)) {
      return true;
    }
  }
  return false;
}



/**
 * Selects the SAML2 session account that was issued for one of the given apps.
 *
 * A Studio preview session is shared across every app opened in preview, so
 * `session.accounts.saml2` can hold a login that belongs to a different app.
 * Treating entry 0 as "this app's user" auto-redirects past the login screen
 * while the API then (correctly) denies the app's data — the user ends up
 * denied or in a redirect loop with no way to authenticate (PS-1005).
 *
 * @param {Object[]} accounts - session.accounts.saml2
 * @param {Array} appIds - the app IDs that count as "this app"
 * @returns {Object|undefined} the matching account, or undefined when the
 *   session holds no SAML2 login for this app
 */
function findAccountForApp(accounts, appIds) {
  if (!accounts || !accounts.length) {
    return undefined;
  }

  var ids = [];

  for (var i = 0; i < (appIds || []).length; i++) {
    if (appIds[i] !== null && appIds[i] !== undefined && appIds[i] !== '') {
      ids.push(parseInt(appIds[i], 10));
    }
  }

  // API versions before PS-1005 do not stamp `appId` onto the session account
  // entries. Scoping against them would deny every SAML2 user, so fall back to
  // the previous behaviour until the entries carry an app.
  var isAppIdentifiable = some(accounts, function(account) {
    return account && account.appId !== null && account.appId !== undefined;
  });

  if (!isAppIdentifiable) {
    return accounts[0];
  }

  // The entries name the app they belong to but we cannot tell which app we
  // are: fail closed, matching the server. Returning accounts[0] here would
  // restore the cross-app redirect while the API denies the data — the exact
  // dead end this change exists to remove.
  if (!ids.length) {
    return undefined;
  }

  for (var j = 0; j < accounts.length; j++) {
    var account = accounts[j];

    if (account && account.appId !== null && account.appId !== undefined
      && ids.indexOf(parseInt(account.appId, 10)) !== -1) {
      return account;
    }
  }

  return undefined;
}

window.FlipletLoginSAMLUtils = {
  assignIn,
  findAccountForApp,
  get,
  pick,
  some
}