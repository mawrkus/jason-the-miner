const stdout = require('./stdout');
const jsonFile = require('./json-file');
const csvFile = require('./csv-file');

module.exports = {
  "stdout": stdout,
  "json-file": jsonFile,
  "csv-file": csvFile,
  "fallback": stdout
};
