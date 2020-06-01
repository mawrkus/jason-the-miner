const HtmlParser = require('./HtmlParser');
const CsvParser = require('./CsvParser');
const IdentityProcessor = require('../IdentityProcessor');
const NoOperationProcessor = require('../NoOperationProcessor');

/**
 * Parsers.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  html: HtmlParser,
  csv: CsvParser,
  identity: IdentityProcessor,
  noop: NoOperationProcessor,
};
