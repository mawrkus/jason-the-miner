const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const csvStringify = require('csv-stringify');
const debug = require('debug')('jason:transform:csv-file');

const csvStringifyAsync = promisify(csvStringify);
const writeFileAsync = promisify(fs.writeFile);

/**
 * A processor that writes results to a CSV file. Depends on the "csv-stringify" package.
 * @see http://csv.adaltas.com/stringify/
 */
class CsvFileWriter {
  /**
   * @param {Object} config The config object
   * @param {*} config.*
   * Keys prefixed with "_" will be used for the transformer's own configuration.
   * Other keys will be used as csv-stringify options.
   * @param {number} config._path
   * @param {string} [config._encoding='utf8']
   */
  constructor(config) {
    this._csvConfig = {};
    this._config = {};

    Object.keys(config).forEach((key) => {
      if (key[0] !== '_') {
        this._csvConfig[key] = config[key];
      } else {
        this._config[key.slice(1)] = config[key];
      }
    });

    this._config = {
      outputPath: path.join(process.cwd(), this._config.path),
      encoding: 'utf8',
      ...this._config,
    };

    debug('CsvFileWriter instance created.');
    debug('CSV config', this._csvConfig);
    debug('config', this._config);
  }

  /**
   * @param {Object} results
   * @return {Promise}
   */
  async run({ results }) {
    if (!results) {
      debug('No results to write!');
      return results;
    }

    const { outputPath, encoding } = this._config;

    const rootKey = Object.keys(results)[0];
    const lines = results[rootKey];

    debug('Writing %d lines to "%s" CSV file "%s"...', lines.length, encoding, outputPath);

    try {
      const csvString = await csvStringifyAsync(lines, this._csvConfig);

      await writeFileAsync(outputPath, csvString, encoding);

      debug('Wrote %d chars.', csvString.length);
    } catch (error) {
      debug('Error writing CSV file: %s!', error.message);
      throw error;
    }

    return outputPath;
  }
}

module.exports = CsvFileWriter;
