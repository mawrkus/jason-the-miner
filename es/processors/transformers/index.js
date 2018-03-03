const StdoutWriter = require('./StdoutWriter');
const JsonFileWriter = require('./JsonFileWriter');
const CsvFileWriter = require('./CsvFileWriter');
const FileDownloader = require('./FileDownloader');
const Emailer = require('./Emailer');
const IdentityProcessor = require('../IdentityProcessor');
const NoOperationProcessor = require('../NoOperationProcessor');

/**
 * Transformers.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  stdout: StdoutWriter,
  'json-file': JsonFileWriter,
  'csv-file': CsvFileWriter,
  'download-file': FileDownloader,
  email: Emailer,
  identity: IdentityProcessor,
  noop: NoOperationProcessor,
};
