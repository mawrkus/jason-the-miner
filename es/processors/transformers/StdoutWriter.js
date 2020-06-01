const debug = require('debug')('jason:transform:stdout');

/**
 * A processor that outputs results to the standard output.
 */
class StdoutWriter {
  /**
   * @param {Object} config
   * @param {string} [config.encoding='utf8']
   */
  constructor({ config = {} } = {}) {
    this._config = { encoding: config.encoding || 'utf8' };
    debug('StdoutWriter instance created.');
    debug('config', this._config);
  }

  /**
   * @param {Object} results The results from the previous transformer if any, or the
   * parse results by default
   * @param {Object} parseResults The original parse results
   * @return {Promise}
   */
  run({ results }) {
    const data = JSON.stringify(results, null, 2) || '';
    debug('Writing %d "%s" chars to stdout...', data.length, this._config.encoding);

    return new Promise((resolve) => {
      if (!process.stdout.write(`${data}\n`, this._config.encoding)) {
        process.stdout.once('drain', () => resolve({ results }));
      } else {
        resolve({ results });
      }
    });
  }
}

module.exports = StdoutWriter;
