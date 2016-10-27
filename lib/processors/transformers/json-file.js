const path = require('path');
const fs = require('fs');
const debug = require('debug')('jason:transform:json');

/**
 * A processor that writes results to JSON files.
 */
class JsonFileWriter {
  /**
   * @param {Object} config
   * @param {string} config.path
   */
  constructor(config) {
    this._outputPath = path.join(process.cwd(), config.path);
    debug('JsonFileWriter instance created.');
    debug('config', config);
  }

  /**
   * @param {Object[]} results
   * @return {Promise.<Object[]>|Promise.<Error>|Promise.<string>}
   */
  run(results) {
    debug('Writing JSON file "%s"...', this._outputPath);

    return new Promise((resolve, reject) => {
      if (!results) {
        debug('No results to write!');
        resolve(results);
        return;
      }

      const json = JSON.stringify(results);

      fs.writeFile(this._outputPath, json, error => {
        if (error) {
          debug(error.message);
          return reject(error);
        }

        debug('Wrote %d chars.', json.length);
        resolve(this._outputPath);
      });
    });
  }
}

module.exports = JsonFileWriter;
