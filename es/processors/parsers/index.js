const HtmlParser = require('./HtmlParser');
const JsonParser = require('./JsonParser');
const IdentityProcessor = require('../IdentityProcessor');
const NoOperationProcessor = require('../NoOperationProcessor');

/**
 * Parsers.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  html: HtmlParser,
  json: JsonParser,
  identity: IdentityProcessor,
  noop: NoOperationProcessor,
};
