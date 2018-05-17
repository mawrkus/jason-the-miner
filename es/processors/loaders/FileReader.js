const nodePath = require('path');
const fs = require('fs');
const { promisify } = require('util');
const debug = require('debug')('jason:load:file');

const readFileAsync = promisify(fs.readFile);

/**
 * Reads the content of a file.
 */
class FileReader {
  /**
   * @param {Object} config
   * @param {string} config.path
   * @param {boolean} [config.stream=false]
   * @param {string} [config.encoding='utf8']
   */
  constructor({ config = {} } = {}) {
    this._config = {
      basePath: process.cwd(),
      stream: false,
      encoding: 'utf8',
      ...config,
    };

    debug('FileReader instance created.');
    debug('config', this._config);
  }

  /**
   * Returns the config. Used for limiting the concurrency when following/paginating.
   * @return {Object}
   */
  getConfig() {
    return this._config;
  }

  /**
   * Builds new load options.
   * @param {string} link
   * @return {Object}
   */
  // eslint-disable-next-line class-methods-use-this
  buildLoadOptions({ link }) {
    const options = { path: link }; // TODO: handle this better with basePath?
    return options;
  }

  /**
   * @param {Object} [options] Optional read options.
   * @return {Promise}
   */
  async run({ options } = {}) {
    const readConfig = { ...this._config, ...options };

    const {
      basePath,
      path,
      stream,
      encoding,
    } = readConfig;

    const currentPath = nodePath.join(basePath, path);

    if (stream) {
      debug('Streaming data from "%s" file "%s"...', encoding, currentPath);
      return fs.createReadStream(currentPath);
    }

    debug('Reading data from "%s" file "%s"...', encoding, currentPath);

    try {
      const start = Date.now();
      const data = await readFileAsync(currentPath, encoding);
      const elapsed = Date.now() - start;
      debug('%dms -> %s chars read from "%s".', elapsed, data.length, currentPath);
      return data;
    } catch (readError) {
      debug(readError.message);
      throw readError;
    }
  }
}

module.exports = FileReader;
