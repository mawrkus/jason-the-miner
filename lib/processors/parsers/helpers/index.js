const matchers = require('./matchers');
const extractors = require('./extractors');
const filters = require('./filters');

/**
 * Parser helpers, by category.
 * @type {Object}
 */
module.exports = {
  match: matchers,
  extract: extractors,
  filter: filters
};
