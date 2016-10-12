const debug = require('debug')('jason:identity');

/**
 * A special kind of processor... that returns the input it received.
 * Useful for fallback when a config file doesn't specify a processor or when it specifies a
 * processor that has not been registered.
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
   * @return {*}
   */
  run(input) { // eslint-disable-line
    debug('Returning input...');
    return input;
  }
}

module.exports = IdentityProcessor;
