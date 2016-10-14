const debug = require('debug')('jason:output:stdout');

/**
 * A processor that outputs results to the standard output.
 */
class StdoutWriter {
  /**
   * @param {Object} config
   */
  constructor(config) {
    debug('StdoutWriter instance created.');
    debug('config', config);
  }

  /**
   * @param {Object[]} results
   * @return {Promise.<Object[]>}
   */
  run(results) { // eslint-disable-line
    const data = JSON.stringify(results);
    debug('Writing %d chars to stdout...', data.length);

    process.stdout.write(data);

    return Promise.resolve(results);
  }
}

module.exports = StdoutWriter;
