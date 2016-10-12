const stdout = require('./stdout');
const jsonFile = require('./json-file');
const csvFile = require('./csv-file');

/**
 * Output processors.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  "stdout": stdout,
  "json-file": jsonFile,
  "csv-file": csvFile,
  "fallback": stdout
};
