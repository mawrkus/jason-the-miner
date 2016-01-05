/* eslint-disable no-console */

'use strict';

module.exports = {

  none() {
    return null;
  },

  all(config, $) {
    this._logger.log('Parsing the last page number...');

    // first only because pagination usually is at the top and bottom of the page
    // and :last is not supported by cheerio as it is in jQuery
    const $lastPageLink = $(config.selector).first();
    if (!$lastPageLink.length) {
      this._logger.warn('Last page link "%s" not found, done.', config.selector);
      return 0;
    }

    const pagesCount = +$lastPageLink.text();
    if (pagesCount <= 0) {
      this._logger.warn('Last page link holds no value, done.');
      return 0;
    }

    this._logger.log('Found last page number: %d', pagesCount);
    return pagesCount;
  },

  follow(config, $) {
    this._logger.log('Parsing the URI to follow...');

    // we want a single link to follow
    const $followLink = $(config.selector).first();
    if (!$followLink.length) {
      this._logger.warn('Follow link "%s" not found, done.', config.selector);
      return '';
    }

    const followUri = $followLink.attr('href');
    if (!followUri) {
      this._logger.warn('The "href" attribute of the follow link holds no value, done.');
      return '';
    }

    // TOOD: pass baseUrl to ensure that we return a URI?

    this._logger.log('Found URI to follow: ', followUri);
    return followUri[0] === '/' ? followUri : '/' + followUri;
  },

  count(config) {
    return config.number;
  }

};

/* eslint-enable no-console */
