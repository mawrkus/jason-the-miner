const html = require('./html');
const json = require('./json');
const identity = require('../identity');
const noAction = require('../no-action');

/**
 * Parsers.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  "html": html,
  "json": json,
  "identity": identity,
  "no-action": noAction
};
