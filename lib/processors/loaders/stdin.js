const debug = require('debug')('jason:load:stdin');

/**
 * Reads from the standard input.
 */
class StdinReader {
  /**
   * @param {Object} config
   * @param {string} [config.encoding='utf8']
   */
  constructor(config) {
    this._config = { encoding: config.encoding || 'utf8' };
    debug('StdinReader instance created.');
    debug('config', this._config);
  }

  /**
   * @return {Promise.<string>|Promise.<Error>}
   */
  run() {
    debug('Reading data from stdin...');

    return new Promise((resolve, reject) => {
      let data = '';

      process.stdin.setEncoding(this._config.encoding);

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

  /**
   * Returns the config and the last run context. Used for following/paginating.
   * @return {Object} { config, context }
   */
  // eslint-disable-next-line class-methods-use-this
  getRunContext() {
    throw new Error('Following/paginating is not supported by "stdin" load processors!');
  }

  /**
   * Builds a new load config. Used for following/paginating.
   * @param {string} link
   * @return {Object}
   */
  // eslint-disable-next-line class-methods-use-this
  buildLoadParams() {
    throw new Error('Following/paginating is not supported by "stdin" load processors!');
  }
}

module.exports = StdinReader;
