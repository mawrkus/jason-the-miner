const html = require('./html');
const identity = require('../identity');
const noAction = require('../no-action');

/**
 * Parsers.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  "html": html,
  "identity": identity,
  "no-action": noAction
};
