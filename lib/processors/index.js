const loaders = require('./loaders');
const parsers = require('./parsers');
const paginators = require('./paginators');
const transformers = require('./transformers');

/**
 * Processors, by category.
 * @type {Object}
 */
module.exports = {
  load: loaders,
  parse: parsers,
  paginate: paginators,
  transform: transformers
};
