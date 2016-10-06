const fs = require('fs');
const Mustache = require('mustache');
const debug = require('debug')('jason:out');

class Templater {

  constructor(config) {
    this._templatePath = config.templatePath;
    this._outputPath = config.outputPath;
    debug('Templater instance created.');
    debug('config', config);
  }

  run(results) {
    debug('Rendering results using template "%s"...', this._templatePath);

    return new Promise((resolve, reject) => {
      try {
        const template = fs.readFileSync(this._templatePath, 'utf8');
        const rendered = Mustache.render(template, { results });

        if (this._outputPath) {
          debug('Saving results to "%s"...', this._outputPath);

          fs.writeFile(this._outputPath, rendered, error => {
            if (error) {
              debug('Error: %s!', error.message);
              reject(error);
            }

            debug('Wrote %d chars.', rendered.length);
            resolve(this._outputPath);
          });
        } else {
          debug('No output path specified, writing to stdout...');

          process.stdout.write(rendered);
          resolve(rendered);
        }
      } catch (error) {
        debug('Error: %s!', error.message);
        reject(error);
      }
    });
  }

}

module.exports = Templater;
