const debug = require('debug')('jason:output');

/* eslint-disable */

class StdoutProcessor {

  constructor(config) {
    this._encoding = config.encoding || 'utf8';
    debug('StdoutProcessor instance created.');
    debug('config', config);
  }

  run(results) {
    const data = JSON.stringify(results);
    debug('Writing %d chars to stdout...', data.length);

    process.stdin.setDefaultEncoding(this._encoding);
    process.stdout.write(data);

    return Promise.resolve(results);
  }

}

module.exports = StdoutProcessor;
