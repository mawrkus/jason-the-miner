const stdin = require('./stdin');
const http = require('./http');
const file = require('./file');
const identity = require('../identity');
const noOp = require('../noop');

/**
 * Loaders.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  "stdin": stdin,
  "http": http,
  "file": file,
  "identity": identity,
  "noop": noOp
};
