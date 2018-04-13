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
   * Returns the config. Used for limiting the concurrency when following/paginating.
   * @return {Object}
   */
  getConfig() {
    return this._config;
  }

  /**
   * Builds all the links defined by the pagination config.
   * @return {Array}
   */
  // eslint-disable-next-line class-methods-use-this
  buildPaginationLinks() {
    return [];
  }

  /**
   * Builds new load options. Used for following/paginating.
   * @param {string} link
   * @return {Object}
   */
  // eslint-disable-next-line class-methods-use-this
  buildLoadOptions() {
    return {};
  }
}

module.exports = IdentityProcessor;
