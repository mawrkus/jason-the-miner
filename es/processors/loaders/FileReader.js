const nodePath = require('path');
const fs = require('fs');
const { promisify } = require('util');
const debug = require('debug')('jason:load:file');

const readFileAsync = promisify(fs.readFile);

const REGEX_PAGINATION_EXP = /{(.+)}/;

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
    this._lastReadConfig = this._readConfig;

    this._config = { concurrency: 1, ...this._config };
    this._config.concurrency = Number(this._config.concurrency); // just in case

    debug('FileReader instance created.');
    debug('read config', this._readConfig);
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
   * Builds all the links defined by the pagination config.
   * @return {Array}
   */
  buildPaginationLinks() {
    const configPath = this._readConfig.path || '';

    const matches = configPath.match(REGEX_PAGINATION_EXP);
    if (!matches) {
      return [configPath];
    }

    let [start, end] = matches[1].split(',').map(s => Number(s));

    if (end === undefined) {
      end = start;
    } else if (Number.isNaN(end) || end < start) {
      debug('Warning: invalid end value for pagination ("%s")! Forcing to %s.', end, start);
      end = start;
    }

    debug('Building pagination from %d -> %d.', start, end);

    const links = [];

    while (start <= end) {
      const path = configPath.replace(REGEX_PAGINATION_EXP, start);
      links.push(path);
      start += 1;
    }

    debug(links);

    return links;
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

  /**
   * @param {Object} [options] Optional read options, used when following/paginating.
   * @return {Promise}
   */
  async run({ options }) {
    this._lastReadConfig = { ...this._lastReadConfig, ...options };

    const {
      basePath,
      path,
      stream,
      encoding,
    } = this._lastReadConfig;

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
