const stdout = require('./stdout');
const jsonFile = require('./json-file');
const csvFile = require('./csv-file');
const downloadFile = require('./download-file');
const eMailer = require('./email');
const identity = require('../identity');
const noOp = require('../noop');

/**
 * Transformers.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  "stdout": stdout,
  "json-file": jsonFile,
  "csv-file": csvFile,
  "download-file": downloadFile,
  "email": eMailer,
  "identity": identity,
  "noop": noOp
};
