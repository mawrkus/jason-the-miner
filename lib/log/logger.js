/* eslint-disable no-console */

'use strict';

const methods = require('./methods');

const slice = Array.prototype.slice;

module.exports = methods.reduce((c, m) => {
  c[m] = function method() {
    // TODO: arrow functions and rest parameters
    const args = slice.call(arguments);
    const now = new Date().toLocaleTimeString();
    // log() outputs to stdout, useful for saving output to text files
    console.log.apply(console, [`${now} - ${m}: ${args[0]}`].concat(args.slice(1)));
  };

  return c;
}, {});

/* eslint-enable no-console */
