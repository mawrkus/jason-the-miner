const debug = require('debug')('jason:identity');

/**
 * A special kind of processor... that returns the input it received.
 */
class IdentityProcessor {
  /**
   * @param  {Object} config
   */
  constructor(config) {
    debug('IdentityProcessor instance created.');
    debug('config', config);
  }

  /**
   * @return {Object}
   */
  getRunContext() { // eslint-disable-line
    return {};
  }

  /**
   * @return {Promise.<*>}
   */
  run(input) { // eslint-disable-line
    debug('Returning input.');
    return Promise.resolve(input);
  }
}

module.exports = IdentityProcessor;
