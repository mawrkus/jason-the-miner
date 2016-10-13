const stdin = require('./stdin');
const http = require('./http');
const file = require('./file');
const identity = require('../identity');
const noAction = require('../no-action');

/**
 * Input processors.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  "stdin": stdin,
  "http": http,
  "file": file,
  "identity": identity,
  "no-action": noAction
};
