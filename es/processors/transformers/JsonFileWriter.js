const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const debug = require('debug')('jason:transform:json-file');

const writeFileAsync = promisify(fs.writeFile);

/**
 * A processor that writes results to a JSON file.
 */
class JsonFileWriter {
  /**
   * @param {Object} config
   * @param {string} config.path
   * @param {string} [config.encoding='utf8']
   */
  constructor(config) {
    this._config = {
      outputPath: path.join(process.cwd(), config.path),
      encoding: config.encoding || 'utf8',
    };
    debug('JsonFileWriter instance created.');
    debug('config', this._config);
  }

  /**
   * @param {Object} results
   * @return {Promise}
   */
  async run({ results }) {
    const { outputPath, encoding } = this._config;

    debug('Writing "%s" JSON file "%s"...', encoding, outputPath);

    const json = JSON.stringify(results);

    try {
      await writeFileAsync(outputPath, json, encoding);
    } catch (error) {
      debug('Error writing JSON file: %s!', error.message);
      throw error;
    }
    debug('Wrote %d chars.', json.length);
    return this._config.outputPath;
  }
}

module.exports = JsonFileWriter;
