const debug = require('debug')('jason:identity');

/**
 * A special kind of processor... that returns the input it received.
 */
class IdentityProcessor {
  /**
   * @param  {Object} config
   */
  constructor(config) {
    this._config = config;
    debug('IdentityProcessor instance created.');
    debug('config', config);
  }

  /**
   * @return {Promise.<*>}
   */
  // eslint-disable-next-line class-methods-use-this
  async run(input) {
    debug('Returning input.');
    return input;
  }

  /**
   * Returns the config . Used for following/paginating.
   * @return {Object}
   */
  getConfig() {
    return this._config;
  }

  /**
   * Builds a new load config. Used for following/paginating.
   * @param {string} link
   * @return {Object}
   */
  // eslint-disable-next-line class-methods-use-this
  buildLoadParams() {
    return {};
  }
}

module.exports = IdentityProcessor;
