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



window.FlipletLoginSAMLUtils = {
  assignIn,
  get,
  pick,
  some
}