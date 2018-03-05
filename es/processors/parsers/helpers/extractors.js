const regexCache = require('./regex-cache');

/**
 * Value extractors.
 * The property names can be used to configure the parsing process.
 * @type {Object}
 */
module.exports = {
  // must always return a string for the filters to work properly
  default: $el => $el.text() || '',
  text: $el => $el.text() || '',
  html: $el => $el.html() || '',
  attr: (attr, $el) => $el.attr(attr) || '',
  regex: (regexString, $el) => {
    const matches = regexCache.get(regexString).exec($el.text());
    return (matches && matches[1]) || '';
  },
};
