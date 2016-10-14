const stdout = require('./stdout');
const jsonFile = require('./json-file');
const csvFile = require('./csv-file');
const identity = require('../identity');
const noAction = require('../no-action');

/**
 * Transformers.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  "stdout": stdout,
  "json-file": jsonFile,
  "csv-file": csvFile,
  "identity": identity,
  "no-action": noAction
};
