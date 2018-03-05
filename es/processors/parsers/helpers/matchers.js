const regexCache = require('./regex-cache');

/**
 * Matchers, conditional selection of DOM elements.
 * The property names can be used to configure the parsing process.
 * @type {Object}
 */
module.exports = {
  default: () => true,
  // fallback to an empty string to prevent false positive in case of undefined
  text: (regexString, $el) => regexCache.get(regexString).test($el.text() || ''),
  html: (regexString, $el) => regexCache.get(regexString).test($el.html() || ''),
  attr: (attr, regexString, $el) => regexCache.get(regexString).test($el.attr(attr) || ''),
};
