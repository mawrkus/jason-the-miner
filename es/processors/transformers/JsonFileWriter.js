const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const makeDir = require('make-dir');
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
  constructor({ config = {} } = {}) {
    this._config = {
      outputPath: path.join(process.cwd(), config.path),
      encoding: config.encoding || 'utf8',
    };
    debug('JsonFileWriter instance created.');
    debug('config', this._config);
  }

  /**
   * @param {Object} results The results from the previous transformer if any, or the
   * parse results by default
   * @param {Object} parseResults The original parse results
   * @return {Promise}
   */
  async run({ results }) {
    const { outputPath, encoding } = this._config;
    const outputFolder = path.dirname(outputPath);

    try {
      const json = JSON.stringify(results);

      debug('Creating ouput folder "%s"...', outputFolder);
      await makeDir(outputFolder);

      debug('Writing "%s" JSON file "%s"...', encoding, outputPath);
      await writeFileAsync(outputPath, json, encoding);

      debug('Wrote %d chars.', json.length);
    } catch (error) {
      debug('Error writing JSON file: %s!', error.message);
      throw error;
    }

    return { results, filePath: outputPath };
  }
}

module.exports = JsonFileWriter;
