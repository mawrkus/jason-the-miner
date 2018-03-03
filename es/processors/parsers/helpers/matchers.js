const regexCache = require('./regex-cache');

/**
 * Matchers, conditional selection of DOM elements.
 * The property names can be used to configure the parsing process.
 * @type {Object}
 */
module.exports = {
  default: () => true,
  text: (regexString, $el) => regexCache.get(regexString).test($el.text()),
  html: (regexString, $el) => regexCache.get(regexString).test($el.html()),
  attr: (attr, regexString, $el) => regexCache.get(regexString).test($el.attr(attr)),
};
