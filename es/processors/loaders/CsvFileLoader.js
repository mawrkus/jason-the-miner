const nodePath = require('path');
const fs = require('fs');
const { promisify } = require('util');
const csvParse = require('csv-parse');
const debug = require('debug')('jason:load:csv-file');

const readFileAsync = promisify(fs.readFile);
const csvParseAsync = promisify(csvParse);

/**
 * A processor that loads records from a CSV file. Depends on the "csv-parse" package.
 @see https://github.com/adaltas/node-csv-parse
 */
class CsvFileLoader {
  /**
   * @param {Object} config The config object
   * @param {number} config.path
   * @param {number} [config.encoding='utf8']
   * @param {Object} config.csv csv-stringify options
   */
  constructor({ config = {} } = {}) {
    this._config = {
      basePath: process.cwd(),
      encoding: 'utf8',
      ...config,
    };

    debug('CsvFileLoader instance created.');
    debug('CSV config', this._config.csv);
    debug('path =', this._config.path);
    debug('encoding =', this._config.encoding);
  }

  /**
   * @param {Object} [options] Optional read options.
   * @return {Promise}
   */
  async run({ options } = {}) {
    const config = { ...this._config, ...options };

    const {
      basePath,
      path,
      encoding,
      csv,
    } = config;

    const currentPath = nodePath.join(basePath, path);

    debug('Parsing "%s" CSV file "%s"...', encoding, currentPath);

    try {
      const start = Date.now();

      const data = await readFileAsync(currentPath, encoding);
      const lines = await csvParseAsync(data, csv);

      const elapsed = Date.now() - start;
      debug('%dms -> %d line(s) parsed from "%s".', elapsed, lines.length, currentPath);

      return lines;
    } catch (readError) {
      debug(readError.message);
      throw readError;
    }
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
}

module.exports = CsvFileLoader;
