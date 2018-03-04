const HtmlParser = require('./HtmlParser');
const IdentityProcessor = require('../IdentityProcessor');
const NoOperationProcessor = require('../NoOperationProcessor');

/**
 * Parsers.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  html: HtmlParser,
  identity: IdentityProcessor,
  noop: NoOperationProcessor,
};
