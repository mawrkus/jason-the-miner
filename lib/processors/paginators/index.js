const urlParam = require('./url-param');
const followLink = require('./follow-link');
const identity = require('../identity');
const noAction = require('../no-action');

/**
 * Paginators.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  "url-param": urlParam,
  "follow-link": followLink,
  "identity": identity,
  "no-action": noAction
};
