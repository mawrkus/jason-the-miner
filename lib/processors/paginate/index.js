const urlParam = require('./url-param');
const followLink = require('./follow-link');
const noAction = require('../no-action');

module.exports = {
  "url-param": urlParam,
  "follow-link": followLink,
  "fallback": noAction
};
