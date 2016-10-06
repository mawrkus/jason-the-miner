const debug = require('debug')('jason:none');

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

  run() { // eslint-disable-line
    debug('Doing nothing...');
    // fallback for promise-based (input, parse, output) AND
    // non-promise-based processors (paginators)
    return null;
  }
}

module.exports = NoActionProcessor;
