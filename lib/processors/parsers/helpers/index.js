const extractors = require('./extractors');
const filters = require('./filters');

/**
 * Parser helpers, by category.
 * @type {Object}
 */
module.exports = {
  extract: extractors,
  filter: filters
};
