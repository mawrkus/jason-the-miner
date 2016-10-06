const path = require('path');
const fs = require('fs');
const csvStringify = require('csv-stringify');
const debug = require('debug')('jason:output');

/**
 * A processor that writes results to a CSV file. Depends on the "csv-stringify" package.
 * @see http://csv.adaltas.com/stringify/
 */
class CsvFileWriter {
  /**
   * @param {Object} config
   * @param {string} config.path
   * @param {string} [config.delimiter=';']
   * @param {string} ... See the "csv-stringify" package for all possible options.
   */
  constructor(config) {
    this._outputPath = path.join(process.cwd(), config.path);
    this._csvConfig = Object.assign({}, config);
    delete this._csvConfig.path;
    debug('CsvFileWriter instance created.');
    debug('path', this._outputPath);
    debug('csv config', this._csvConfig);
  }

  /**
   * @param {Object[]} results
   * @return {Promise.<Object[]>|Promise.<Error>|Promise.<string>}
   */
  run(results) {
    debug('Writing CSV file "%s"...', this._outputPath);
    return new Promise((resolve, reject) => {
      if (!results || !results.length) {
        debug('No results to write!');
        resolve(results);
        return;
      }

      csvStringify(results, this._csvConfig, (error, csvString) => {
        if (error) {
          debug('Error stringifying: %s!', error.message);
          reject(error);
          return;
        }

        fs.writeFile(this._outputPath, csvString, error => {
          if (error) {
            debug('Error writing file: %s!', error.message);
            reject(error);
            return;
          }
          debug('Wrote %d chars.', csvString.length);
          resolve(this._outputPath);
        });
      });
    });
  }
}

module.exports = CsvFileWriter;
