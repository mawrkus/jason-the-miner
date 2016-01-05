'use strict';

module.exports = {

  identity(content) {
    return content;
  },

  trim(content) {
    return Array.isArray(content) ? content.map(c => c.trim()) : content.trim();
  }

};
