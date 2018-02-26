const nodePath = require('path');
const fs = require('fs');
const debug = require('debug')('jason:load:file');

// const REGEX_ABSOLUTE_PATH = /^file?:\/\//;

/**
 * Reads the content of a file.
 */
class FileReader {
  /**
   * @param {Object} config
   * @param {string} config.path
   * @param {boolean} [config.stream=false]
   */
  constructor(config) {
    this._config = {
      basePath: process.cwd(),
      path: config.path,
      stream: config.stream || false,
    };
    this._lastReadParams = { ...this._config };

    debug('FileReader instance created.');
    debug('config', this._config);
  }

  /**
   * @param {Object} [readConfig={}] An optional read config, used when following/paginating.
   * @return {Promise.<string|ReadStream> | Promise.<Error>}
   */
  run(readConfig = {}) {
    Object.assign(this._lastReadParams, readConfig);
    const { basePath, path, stream } = this._lastReadParams;
    const currentPath = nodePath.join(basePath, path);

    debug('Reading data from "%s"...', currentPath);

    if (stream) {
      return Promise.resolve(fs.createReadStream(currentPath));
    }

    return new Promise((resolve, reject) => {
      fs.readFile(currentPath, 'utf8', (error, data) => {
        if (error) {
          debug(error.message);
          return reject(error);
        }

        debug('%d chars read.', data.length);
        resolve(data);
      });
    });
  }

  /**
   * Returns the config and the last run context. Used for following/paginating.
   * @return {Object} { config, context }
   */
  getRunContext() {
    return { config: this._config, context: this._lastReadParams };
  }

  /**
   * Builds a new load config. Used for following/paginating.
   * @param {string} link
   * @return {Object}
   */
  buildLoadParams({ link }) {
    const loadParams = { ...this._lastReadParams };

    loadParams.path = link; // TODO: handle this better

    return loadParams;
  }
}

module.exports = FileReader;
