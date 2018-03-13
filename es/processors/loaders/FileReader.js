const nodePath = require('path');
const fs = require('fs');
const { promisify } = require('util');
const Bluebird = require('bluebird');
const debug = require('debug')('jason:load:file');

const readFileAsync = promisify(fs.readFile);

const REGEX_PAGINATION_PARAMS = /[^{]*{\D*(\d+)\D*,\D*(\d+).*/;
const REGEX_PAGINATION_EXP = /{.+}/;

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
    this._readConfig = {};
    this._config = {};

    Object.keys(config).forEach((key) => {
      if (key[0] !== '_') {
        this._readConfig[key] = config[key];
      } else {
        this._config[key.slice(1)] = config[key];
      }
    });

    this._readConfig = {
      basePath: process.cwd(),
      stream: false,
      encoding: 'utf8',
      ...this._readConfig,
    };

    this._config = { concurrency: 1, ...this._config };
    this._config.concurrency = Number(this._config.concurrency); // just in case

    this._lastReadConfig = this._readConfig;
    this._paginationOptions = this._buildPaginationOptions();

    debug('FileReader instance created.');
    debug('read config', this._readConfig);
    debug('config', this._config);
    debug('pagination options', this._paginationOptions);
  }

  /**
   * @return {Array}
   */
  _buildPaginationOptions() {
    const options = [];

    const paginationParams = this._readConfig.path.match(REGEX_PAGINATION_PARAMS);

    if (paginationParams) {
      const [startPage, endPage] = paginationParams.slice(1, 3).map(Number);
      let n = startPage;

      while (n <= endPage) {
        const path = this._readConfig.path.replace(REGEX_PAGINATION_EXP, n);
        options.push({ ...this._readConfig, path });
        n += 1;
      }
    }

    return options;
  }

  /**
   * @param {Object} [options] Optional read options, used when following/paginating.
   * @param {boolean} [enablePagination] Whether or not to load all the pages defined by the config.
   * @return {Promise}
   */
  async run({ options, enablePagination }) {
    if (!enablePagination) {
      debug('Pagination is not enabled');
      this._lastReadConfig = { ...this._lastReadConfig, ...options };
      return this._run({ options: this._lastReadConfig });
    }

    if (!this._paginationOptions.length) {
      this._paginationOptions = [this._lastReadConfig];
    }

    debug('Pagination is enabled: %d page(s) at max concurrency=%d', this._paginationOptions.length, this._config.concurrency);

    return Bluebird.map(
      this._paginationOptions,
      (paginationOptions) => {
        this._lastReadConfig = { ...this._lastReadConfig, paginationOptions, ...options };
        return this._run({ options: paginationOptions });
      },
      { concurrency: this._config.concurrency },
    );
  }

  /**
   * @param {Object} [options] Optional read options.
   * @return {Promise.<string|ReadStream> | Promise.<Error>}
   */
  // eslint-disable-next-line class-methods-use-this
  async _run({ options }) {
    const {
      basePath,
      path,
      stream,
      encoding,
    } = options;

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
   * Builds new load options. Used for following/paginating.
   * @param {string} link
   * @return {Object}
   */
  buildLoadOptions({ link }) {
    const options = { ...this._lastReadoptions };
    options.path = link; // TODO: handle this better?
    return options;
  }
}

module.exports = FileReader;
