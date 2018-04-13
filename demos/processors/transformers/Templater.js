const fs = require('fs');
const { promisify } = require('util');
const Mustache = require('mustache'); // eslint-disable-line import/no-extraneous-dependencies
const debug = require('debug')('jason:transform:templater');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

class Templater {
  /**
   * @param {Object} config
   * @param {string} config.templatePath
   * @param {string} config.outputPath
   * @param {string} [config.encoding='utf8']
   */
  constructor(config) {
    this._config = {
      templatePath: config.templatePath,
      outputPath: config.outputPath,
      encoding: config.encoding || 'utf8',
    };
    debug('Templater instance created.');
    debug('config', this._config);
  }

  /**
   * @param {Object} results
   * @return {Promise}
   */
  async run({ results }) {
    const { templatePath, outputPath, encoding } = this._config;
    debug('Rendering results using template "%s"...', templatePath);

    try {
      const template = await readFileAsync(templatePath, encoding);
      const rendered = Mustache.render(template, results);

      if (outputPath) {
        debug('Saving results to "%s" file "%s"...', encoding, outputPath);
        await writeFileAsync(outputPath, rendered, encoding);
        debug('Wrote %d chars.', rendered.length);
        return outputPath;
      }

      debug('No output path specified, writing to stdout...');
      process.stdout.write(rendered);
      return rendered;
    } catch (error) {
      debug(error.message);
      throw error;
    }
  }
}

module.exports = Templater;
