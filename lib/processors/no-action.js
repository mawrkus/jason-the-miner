const debug = require('debug')('jason:none');

/* eslint-disable */

/**
 * A special kind of processor... that does nothing except returnin "null" when run.
 * Useful for fallback when a config file doesn't specify a processor or when it specifies a
 * processor that has not been registered.
 */
class NoActionProcessor {
  /**
   * @param  {Object} config
   */
  constructor(config) {
    debug('NoActionProcessor instance created.');
    debug('config', config);
  }

  run() {
    debug('Doing nothing...');
    // fallback for promised-based (input, parse, output) AND
    // non-promised-based processors (paginators)
    return null;
  }

}

module.exports = NoActionProcessor;
