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
  constructor(config) {
    this._config = {
      basePath: process.cwd(),
      path: config.path,
      stream: config.stream || false,
      encoding: config.encoding || 'utf8',
    };
    this._lastReadParams = { ...this._config };

    debug('FileReader instance created.');
    debug('config', this._config);
  }

  /**
   * @param {Object} [readConfig] An optional read config, used when following/paginating.
   * @return {Promise.<string|ReadStream> | Promise.<Error>}
   */
  async run(readConfig) {
    Object.assign(this._lastReadParams, readConfig);

    const {
      basePath,
      path,
      stream,
      encoding,
    } = this._lastReadParams;

    const currentPath = nodePath.join(basePath, path);

    if (stream) {
      debug('Streaming data from "%s" file "%s"...', encoding, currentPath);
      return fs.createReadStream(currentPath);
    }

    debug('Reading data from "%s" file "%s"...', encoding, currentPath);

    try {
      const data = await readFileAsync(currentPath, encoding);
      debug('%d chars read.', data.length);
      return data;
    } catch (readError) {
      debug(readError.message);
      throw readError;
    }
  }

  /**
   * Returns the config . Used for following/paginating.
   * @return {Object}
   */
  getConfig() {
    return this._config;
  }

  /**
   * Builds a new load config. Used for following/paginating.
   * @param {string} link
   * @return {Object}
   */
  buildLoadParams({ link }) {
    const loadParams = { ...this._lastReadParams };

    loadParams.path = link; // TODO: handle this better?

    return loadParams;
  }
}

module.exports = FileReader;
