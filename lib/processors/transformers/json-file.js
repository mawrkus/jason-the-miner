const path = require('path');
const fs = require('fs');
const debug = require('debug')('jason:output:json');

/**
 * A processor that writes results to a JSON file.
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
      if (!results || !results.length) {
        debug('No results to write!');
        resolve(results);
        return;
      }

      const json = JSON.stringify(results);

      fs.writeFile(this._outputPath, json, error => {
        if (error) {
          debug(error.message);
          reject(error);
          return;
        }

        debug('Wrote %d chars.', json.length);
        resolve(this._outputPath);
      });
    });
  }
}

module.exports = JsonFileWriter;
