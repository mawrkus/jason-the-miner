const debug = require('debug')('jason:input');

class StdinProcessor {

  constructor(config) {
    this._encoding = config.encoding;
    debug('StdinProcessor instance created.');
    debug('config', config);
  }

  getConfig() { // eslint-disable-line
    return { encoding: this._encoding };
  }

  run() { // eslint-disable-line
    debug('Reading data from stdin...');

    return new Promise((resolve, reject) => {
      let data = '';

      process.stdin.setEncoding(this._encoding);

      process.stdin
        .on('readable', () => {
          let chunk;
          while (chunk = process.stdin.read()) { // eslint-disable-line
            data += chunk;
          }
        })
        .on('end', () => {
          debug('Read %d chars from stdin.', data.length);
          resolve(data);
        })
        .on('error', error => {
          debug('Error: %s!', error.message);
          reject(error);
        });
    });
  }

}

module.exports = StdinProcessor;
