const loaders = require('./loaders');
const parsers = require('./parsers');
const transformers = require('./transformers');

/**
 * Processors, by category.
 * @type {Object}
 */
module.exports = {
  load: loaders,
  parse: parsers,
  transform: transformers,
};
