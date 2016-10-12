const debug = require('debug')('jason:noop');

/**
 * A special kind of processor... that does nothing except returning "null" when run.
 * Useful for fallback when a config file doesn't specify a processor or when it specifies a
 * processor that has not been registered.
 */
class NoOperationProcessor {
  /**
   * @param  {Object} config
   */
  constructor(config) {
    debug('NoOperationProcessor instance created.');
    debug('config', config);
  }

  /**
   * @return {Object}
   */
  getRunContext() { // eslint-disable-line
    return {};
  }

  /**
   * Returns null as a fallback for promise-based (input, parse, output) AND
   * non-promise-based processors like paginators.
   * @return {null}
   */
  run() { // eslint-disable-line
    debug('Doing nothing...');
    return null;
  }
}

module.exports = NoOperationProcessor;
