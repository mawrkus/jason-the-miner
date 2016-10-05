const path = require('path');
const fs = require('fs');
const debug = require('debug')('jason:input');

class FileLoader {

  constructor(config) {
    this._path = path.join(process.cwd(), config.path);
    debug('FileLoader instance created.');
    debug('config', config);
  }

  getConfig() {
    return { path: this._path };
  }

  run() {
    debug('Reading data from "%s"...', this._path);
    return new Promise((resolve, reject) => {
      fs.readFile(this._path, 'utf8', (error, data) => {
        if (error) {
          debug('Error: %s!', error.message);
          reject(error);
          return;
        }

        debug('%d chars read.', data.length);
        resolve(data);
      });
    });
  }

}

module.exports = FileLoader;
