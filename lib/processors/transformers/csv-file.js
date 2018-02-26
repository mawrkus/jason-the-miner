const path = require('path');
const fs = require('fs');
const csvStringify = require('csv-stringify');
const debug = require('debug')('jason:transform:csv-file');

/**
 * A processor that writes results to CSV files. Depends on the "csv-stringify" package.
 * @see http://csv.adaltas.com/stringify/
 */
class CsvFileWriter {
  /**
   * @param {Object} config
   * @param {string} config.path
   * @param {string} [config.header=true]
   * @param {string} [config.delimiter=';']
   * @param {*} ... See the "csv-stringify" package for all possible options.
   */
  constructor(config) {
    this._config = {
      outputPath: path.join(process.cwd(), config.path),
      csv: Object.assign({ header: true, delimiter: ';' }, config),
    };
    delete this._config.csv.path;
    debug('CsvFileWriter instance created.');
    debug('config', this._config);
  }

  /**
   * @param {Object} results
   * @return {Promise}
   */
  run(results) {
    return new Promise((resolve, reject) => {
      if (!results) {
        debug('No results to write!');
        return resolve(results);
      }

      const rootKey = Object.keys(results)[0];
      const lines = results[rootKey];

      debug('Writing %d lines to CSV file "%s"...', lines.length, this._config.outputPath);

      csvStringify(lines, this._config.csv, (error, csvString) => {
        if (error) {
          debug('Error stringifying: %s!', error.message);
          return reject(error);
        }

        fs.writeFile(this._config.outputPath, csvString, error => {
          if (error) {
            debug('Error writing file: %s!', error.message);
            return reject(error);
          }

          debug('Wrote %d chars.', csvString.length);
          resolve(this._config.outputPath);
        });
      });
    });
  }
}

module.exports = CsvFileWriter;
