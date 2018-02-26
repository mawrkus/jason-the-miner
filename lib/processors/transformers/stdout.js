const debug = require('debug')('jason:transform:stdout');

/**
 * A processor that outputs results to the standard output.
 */
class StdoutWriter {
  /**
   * @param {Object} config
   * @param {string} [config.encoding='utf8']
   */
  constructor(config) {
    this._config = { encoding: config.encoding || 'utf8' };
    debug('StdoutWriter instance created.');
    debug('config', this._config);
  }

  /**
   * @param {Object} results
   * @return {Promise}
   */
  run(results) {
    const data = JSON.stringify(results, null, 2) || '';
    debug('Writing %d chars to stdout...', data.length);

    return new Promise(resolve => {
      if (!process.stdout.write(`${data}\n`, this._encoding)) {
        process.stdout.once('drain', () => resolve(results));
      } else {
        resolve(results);
      }
    });
  }
}

module.exports = StdoutWriter;
