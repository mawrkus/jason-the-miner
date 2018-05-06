const debug = require('debug')('jason:noop');

/**
 * A special kind of processor... that does nothing except returning "null" when run.
 */
class NoOperationProcessor {
  /**
   * @param  {Object} config
   */
  constructor({ config }) {
    debug('NoOperationProcessor instance created.');
    debug('config', config);
  }

  /**
   * Returns undefined as a fallback for promise-based processors.
   * @return {undefined}
   */
  // eslint-disable-next-line class-methods-use-this
  async run() {
    debug('Doing nothing.');
  }

  /**
   * Returns the config. Used for limiting the concurrency when following/paginating.
   * @return {Object}
   */
  getConfig() {
    return this._config;
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

module.exports = NoOperationProcessor;
