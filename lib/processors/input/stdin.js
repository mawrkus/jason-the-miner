const debug = require('debug')('jason:input:stdin');

/**
 * A processor that reads from the standard input.
 */
class StdinReader {
  /**
   * @param {Object} config
   * @param {string} [config.encoding='utf8']
   */
  constructor(config) {
    this._encoding = config.encoding || 'utf8';
    debug('StdinReader instance created.');
    debug('config', config);
  }

  /**
   * Returns the current/last run context. It can be used by the paginators to do their job.
   * @return {Object}
   */
  getRunContext() {
    return { encoding: this._encoding };
  }

  /**
   * @return {Promise.<string>|Promise.<Error>}
   */
  run() {
    debug('Reading data from stdin...');

    return new Promise((resolve, reject) => {
      let data = '';

      process.stdin.setEncoding(this._encoding);
      process.stdin
        .on('readable', () => {
          let chunk;
          while (chunk = process.stdin.read()) { // eslint-disable-line
            data += chunk;
          }
        })
        .on('end', () => {
          debug('Read %d chars from stdin.', data.length);
          resolve(data);
        })
        .on('error', error => {
          debug(error.message);
          reject(error);
        });
    });
  }
}

module.exports = StdinReader;
