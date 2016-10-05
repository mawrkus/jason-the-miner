const debug = require('debug')('jason:none');

/* eslint-disable */

class NoActionProcessor {

  constructor(config) {
    debug('NoActionProcessor instance created.');
    debug('config', config);
  }

  run() {
    debug('Doing nothing...');
    // fallback for promised-based AND non-promised-based processors
    return null;
  }

}

module.exports = NoActionProcessor;
