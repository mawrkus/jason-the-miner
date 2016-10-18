const path = require('path');
const fs = require('fs');
const debug = require('debug')('jason:input:file');

/**
 * Reads the content of a file.
 */
class FileReader {
  /**
   * @param {Object} config
   * @param {string} config.path
   */
  constructor(config) {
    this._path = path.join(process.cwd(), config.path);
    debug('FileReader instance created.');
    debug('config', config);
  }

  /**
   * Returns the current/last run context. It can be used by the paginators to do their job.
   * @return {Object}
   */
  getRunContext() {
    return { path: this._path };
  }

  /**
   * @return {Promise.<string>|Promise.<Error>}
   */
  run() {
    debug('Reading data from "%s"...', this._path);

    return new Promise((resolve, reject) => {
      fs.readFile(this._path, 'utf8', (error, data) => {
        if (error) {
          debug(error.message);
          return reject(error);
        }

        debug('%d chars read.', data.length);
        resolve(data);
      });
    });
  }
}

module.exports = FileReader;
