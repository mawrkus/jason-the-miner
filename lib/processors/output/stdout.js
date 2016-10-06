const debug = require('debug')('jason:output');

/**
 * A processor that outputs results to standard output.
 */
class StdoutProcessor {
  /**
   * @param {Object} config
   * @param {string} [config.encoding='utf8']
   */
  constructor(config) {
    this._encoding = config.encoding || 'utf8';
    debug('StdoutProcessor instance created.');
    debug('config', config);
  }

  /**
   * @param {Object[]} results
   * @return {Promise.<Object[]>}
   */
  run(results) {
    const data = JSON.stringify(results);
    debug('Writing %d chars to stdout...', data.length);

    process.stdin.setDefaultEncoding(this._encoding);
    process.stdout.write(data);

    return Promise.resolve(results);
  }
}

module.exports = StdoutProcessor;
