const html = require('./html');
const identity = require('../identity');
const noAction = require('../no-action');

/**
 * Parse processors.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  "html": html,
  "identity": identity,
  "no-action": noAction
};
