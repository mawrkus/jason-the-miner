const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const csvStringify = require('csv-stringify');
const debug = require('debug')('jason:transform:csv-file');

const csvStringifyAsync = promisify(csvStringify);
const writeFileAsync = promisify(fs.writeFile);

/**
 * A processor that writes results to CSV files. Depends on the "csv-stringify" package.
 * @see http://csv.adaltas.com/stringify/
 */
class CsvFileWriter {
  /**
   * @param {Object} config
   * @param {string} config.path
   * @param {string} [config.encoding='utf8']
   * @param {string} [config.header=true]
   * @param {string} [config.delimiter=';']
   * @param {*} ... See the "csv-stringify" package for all possible options.
   */
  constructor(config) {
    this._config = {
      outputPath: path.join(process.cwd(), config.path),
      encoding: config.encoding || 'utf8',
      csv: {
        header: true,
        delimiter: ';',
        ...config,
      },
    };

    delete this._config.csv.path;

    debug('CsvFileWriter instance created.');
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

    const { outputPath, encoding, csv: csvConfig } = this._config;

    const rootKey = Object.keys(results)[0];
    const lines = results[rootKey];

    debug('Writing %d lines to "%s" CSV file "%s"...', lines.length, encoding, outputPath);

    try {
      const csvString = await csvStringifyAsync(lines, csvConfig);

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
