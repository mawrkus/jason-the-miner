const path = require('path');
const fs = require('fs');
const csvStringify = require('csv-stringify');
const debug = require('debug')('jason:transform:csv');

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
    this._outputPath = path.join(process.cwd(), config.path);
    this._csvConfig = Object.assign({ header: true, delimiter: ';' }, config);
    delete this._csvConfig.path;
    debug('CsvFileWriter instance created.');
    debug('output path', this._outputPath);
    debug('csv config', this._csvConfig);
  }

  /**
   * @param {Object[]} results
   * @return {Promise.<Object[]>|Promise.<Error>|Promise.<string>}
   */
  run(results) {
    return new Promise((resolve, reject) => {
      if (!results || !Object.keys(results).length) {
        debug('No results to write!');
        resolve(results);
        return;
      }

      Object.keys(results).forEach(schemaName => {
        const filePath = this._buildFilePath(schemaName);
        debug('Writing to CSV file "%s"...', filePath);

        csvStringify(results[schemaName], this._csvConfig, (error, csvString) => {
          if (error) {
            debug('Error stringifying: %s!', error.message);
            return reject(error);
          }

          fs.writeFile(filePath, csvString, error => {
            if (error) {
              debug('Error writing file: %s!', error.message);
              return reject(error);
            }

            debug('Wrote %d chars.', csvString.length);
            resolve(this._outputPath);
          });
        });
      });
    });
  }

  /**
   * @param {string} schemaName
   * @return {string}
   */
  _buildFilePath(schemaName) {
    const parsedPath = path.parse(this._outputPath);
    delete parsedPath.base;
    parsedPath.name = `${parsedPath.name}-${schemaName}`;
    return path.format(parsedPath);
  }
}

module.exports = CsvFileWriter;
