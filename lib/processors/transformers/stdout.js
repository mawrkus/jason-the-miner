const debug = require('debug')('jason:output:stdout');

/**
 * A processor that outputs results to standard output.
 */
class StdoutWriter {
  /**
   * @param {Object} config
   * @param {string} [config.encoding='utf8']
   */
  constructor(config) {
    this._encoding = config.encoding || 'utf8';
    debug('StdoutWriter instance created.');
    debug('config', config);
  }

  /**
   * @param {Object[]} results
   * @return {Promise.<Object[]>}
   */
  run(results) {
    const data = JSON.stringify(results);
    debug('Writing %d chars to stdout...', data.length);

    process.stdout.setDefaultEncoding(this._encoding);
    process.stdout.write(data);

    return Promise.resolve(results);
  }
}

module.exports = StdoutWriter;
