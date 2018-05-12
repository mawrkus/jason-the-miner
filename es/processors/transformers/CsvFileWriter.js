const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const csvStringify = require('csv-stringify');
const makeDir = require('make-dir');
const debug = require('debug')('jason:transform:csv-file');

const csvStringifyAsync = promisify(csvStringify);
const writeFileAsync = promisify(fs.writeFile);
const appendFileAsync = promisify(fs.appendFile);

/**
 * A processor that writes results to a CSV file. Depends on the "csv-stringify" package.
 * @see http://csv.adaltas.com/stringify/
 */
class CsvFileWriter {
  /**
   * @param {Object} config The config object
   * @param {Object} config.csv csv-stringify options
   * @param {number} config.path
   * @param {string} [config.encoding='utf8']
   * @param {boolean} [config.append=false]
   */
  constructor({ config = {} }) {
    this._config = {
      encoding: 'utf8',
      append: false,
      ...config,
      outputPath: path.join(process.cwd(), config.path),
    };

    debug('CsvFileWriter instance created.');
    debug('CSV config', this._config.csv);
    debug('path', this._config.path);
    debug('encoding', this._config.encoding);
    debug('append', this._config.append);
  }

  /**
   * @param {Object} results The results from the previous transformer if any, or the
   * parse results by default
   * @param {Object} parseResults The original parse results
   * @return {Promise}
   */
  async run({ results }) {
    if (!results) {
      debug('No results to write!');
      return results;
    }

    const {
      csv,
      outputPath,
      encoding,
      append,
    } = this._config;

    const outputFolder = path.dirname(outputPath);
    const rootKey = Object.keys(results)[0];
    const lines = Array.isArray(results) ? results : (results[rootKey] || []);

    try {
      debug('Creating ouput folder "%s"...', outputFolder);
      await makeDir(outputFolder);

      debug('Writing %d lines to "%s" CSV file "%s"...', lines.length, encoding, outputPath);
      const csvString = await csvStringifyAsync(lines, csv);

      if (append) {
        await appendFileAsync(outputPath, csvString, encoding);
      } else {
        await writeFileAsync(outputPath, csvString, encoding);
      }

      debug('Wrote %d chars.', csvString.length);
    } catch (error) {
      debug('Error writing CSV file: %s!', error.message);
      throw error;
    }

    return { results, filePath: outputPath };
  }
}

module.exports = CsvFileWriter;
