const debug = require('debug')('jason:load:stdin');

/**
 * Reads from the standard input.
 */
class StdinReader {
  /**
   * @param {Object} config
   * @param {string} [config.encoding='utf8']
   */
  constructor({ config }) {
    this._config = { encoding: config.encoding || 'utf8' };
    debug('StdinReader instance created.');
    debug('config', this._config);
  }

  /**
   * @param {Object} [options] Optional read options.
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
          while (chunk = process.stdin.read()) { // eslint-disable-line no-cond-assign
            data += chunk;
          }
        })
        .on('end', () => {
          debug('Read %d chars from stdin.', data.length);
          resolve(data);
        })
        .on('error', (error) => {
          debug(error.message);
          reject(error);
        });
    });
  }

  /**
   * Returns the config. Used for limiting the concurrency when following/paginating.
   * @return {Object}
   */
  getConfig() {
    return this._config;
  }

  /**
   * Builds all the links defined by the pagination config.
   * @return {Array}
   */
  // eslint-disable-next-line class-methods-use-this
  buildPaginationLinks() {
    // dummy link to allow the harvesting process to start
    return ['stdin is in the house'];
  }

  /**
   * Builds new load options.
   * @param {string} link
   * @return {Object}
   */
  // eslint-disable-next-line class-methods-use-this
  buildLoadOptions() {
    return {};
  }
}

module.exports = StdinReader;
