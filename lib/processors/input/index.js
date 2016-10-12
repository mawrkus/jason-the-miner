const stdin = require('./stdin');
const http = require('./http');
const file = require('./file');

/**
 * Input processors.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  "stdin": stdin,
  "http": http,
  "file": file,
  "fallback": stdin
};
