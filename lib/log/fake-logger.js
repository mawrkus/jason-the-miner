'use strict';

const methods = require('./methods');

module.exports = methods.reduce((c, m) => {
  c[m] = () => {};
  return c;
}, {});
