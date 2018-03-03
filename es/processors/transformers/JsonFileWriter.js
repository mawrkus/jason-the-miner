const path = require('path');
const fs = require('fs');
const debug = require('debug')('jason:transform:json-file');

/**
 * A processor that writes results to JSON files.
 */
class JsonFileWriter {
  /**
   * @param {Object} config
   * @param {string} config.path
   */
  constructor(config) {
    this._config = {
      outputPath: path.join(process.cwd(), config.path),
    };
    debug('JsonFileWriter instance created.');
    debug('config', this._config);
  }

  /**
   * @param {Object} results
   * @return {Promise}
   */
  run(results) {
    debug('Writing JSON file "%s"...', this._config.outputPath);

    return new Promise((resolve, reject) => {
      if (!results) {
        debug('No results to write!');
        return resolve(results);
      }

      const json = JSON.stringify(results);

      return fs.writeFile(this._config.outputPath, json, (error) => {
        if (error) {
          debug(error.message);
          return reject(error);
        }

        debug('Wrote %d chars.', json.length);
        return resolve(this._config.outputPath);
      });
    });
  }
}

module.exports = JsonFileWriter;
