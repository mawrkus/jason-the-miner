const debug = require('debug')('jason:paginate:next');

/**
 * A processor that manages the pagination by searching for the "next" link in the DOM.
 */
class NextLinkPaginator {
  /**
   * @param {Object} config
   * @param {string} config.selector The selector that matches the "next" link
   * @param {number} [config.limit=0] The maximum number of pages to process
   */
  constructor(config) {
    this._selector = config.selector;
    this._limit = config.limit > 0 ? config.limit : 0;
    this._remainingPages = this._limit;
    debug('NextLinkPaginator instance created.');
    debug('selector', this._selector);
    debug('limit', this._limit);
  }

  /**
   * Runs the processor: uses the (last) run context of the parser to find the "next" link element.
   * It expects the parser to provide a Cheerio/jQuery-like object that has loaded the HTML.
   * Returns null when no "next" url is found or when the limit of pages is reached.
   * @param {Object} [loaderRunContext={}]
   * @param {Object} parserRunContext
   * @param {Cheerio} parserRunContext.$
   * @return {null|Object} An object containing the "next" url
   */
  run({ loaderRunContext, parserRunContext } = {}) { // eslint-disable-line
    const $ = parserRunContext.$;

    // only the 1st found because pagination usually appears on top and bottom of the page
    const $nextLink = $(this._selector).first();
    if (!$nextLink.length) {
      debug('No "%s" link element found, done.', this._selector);
      return null;
    }

    const nextUrl = $nextLink.attr('href');
    if (!nextUrl) {
      debug('Empty "href" attribute on the link element, done.');
      return null;
    }

    if (--this._remainingPages > 0) {
      debug('Following link to "%s"... %d page(s) to go.', nextUrl, this._remainingPages);
      return { url: nextUrl };
    }

    debug('Last page reached - %d page(s) in total.', this._limit);
    return null;
  }
}


module.exports = NextLinkPaginator;
