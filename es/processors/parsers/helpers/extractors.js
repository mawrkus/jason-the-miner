const moment = require('moment');
const uuid = require('uuid/v1');
const regexCache = require('./regex-cache');

/**
 * Value extractors.
 * The property names can be used to configure the parsing process.
 * @type {Object}
 */
module.exports = {
  // must always return a string for the filters to work properly
  default: $el => $el.text() || '',
  text: (staticTextOr$el, $el) => {
    const text = !$el ? staticTextOr$el.text() : staticTextOr$el;
    return text || '';
  },
  html: $el => $el.html() || '',
  attr: (attr, $el) => $el.attr(attr) || '',
  regex: (regexString, $el) => {
    const matches = regexCache.get(regexString).exec($el.text());
    return (matches && matches[1]) || '';
  },
  date: (inputFormat, outputFormat, $el) => {
    const dateString = $el.text() || '';
    return moment(dateString, inputFormat).format(outputFormat);
  },
  uuid: () => uuid(),
  count: () => 1,
};
