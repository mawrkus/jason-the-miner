const html = require('./html');
const noAction = require('../no-action');

/**
 * Parse processors.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  "html": html,
  "fallback": noAction
};
