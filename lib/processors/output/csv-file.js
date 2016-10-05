const path = require('path');
const fs = require('fs');
const stringify = require('csv-stringify');
const debug = require('debug')('jason:output');

class CsvFileWriter {

  constructor(config) {
    this._outputPath = path.join(process.cwd(), config.path);
    this._delimiter = config.delimiter || ';';
    debug('CsvFileWriter instance created.');
    debug('config', config);
  }

  run(results) {
    debug('Writing CSV file "%s"...', this._outputPath);
    return new Promise((resolve, reject) => {
      if (!results || !results.length) {
        debug('No results to write!');
        resolve(results);
        return;
      }

      stringify(results, { delimiter: this._delimiter }, (error, csvString) => {
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
