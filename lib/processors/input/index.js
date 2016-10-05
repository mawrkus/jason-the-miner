const stdin = require('./stdin');
const http = require('./http');
const file = require('./file');

module.exports = {
  "stdin": stdin,
  "http": http,
  "file": file,
  "fallback": stdin
};
