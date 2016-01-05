'use strict';

const regExpCache = {};

module.exports = {

  text($part) {
    return $part.text();
  },

  html($part) {
    return $part.html();
  },

  attr($part, attributeName) {
    return $part.attr(attributeName);
  },

  regexp($part, regExpString) {
    let regExp = regExpCache[regExpString];
    if (!regExp) {
      regExp = regExpCache[regExpString] = new RegExp(regExpString);
    }

    const match = regExp.exec(this.text($part));

    return match[1];
  },

  array($parts, subExtractor) {
    let i = $parts.length;
    const result = [];

    // map() passes the DOM element as parameter, not the cheerio object
    while ( i-- ) {
      result.unshift(subExtractor($parts.eq(i)));
    }

    return result;
  },

};
