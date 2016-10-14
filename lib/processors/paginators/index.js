const urlParam = require('./url-param');
const nextLink = require('./next-link');
const identity = require('../identity');
const noAction = require('../no-action');

/**
 * Paginators.
 * The property names can be used to configure the scraping process.
 * @type {Object}
 */
module.exports = {
  "url-param": urlParam,
  "next-link": nextLink,
  "identity": identity,
  "no-action": noAction
};
