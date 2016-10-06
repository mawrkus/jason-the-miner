const debug = require('debug')('jason:paginate');

/**
 * A processor that manages the pagination by searching for the "next" link in the DOM.
 */
class FollowLinkPaginator {
  /**
   * @param {Object} config
   * @param {string} config.selector The selector that matches the "next" link
   * @param {number} config.limit The maximum number of pages to process
   */
  constructor(config) {
    this._selector = config.selector;
    this._limit = config.limit > 0 ? config.limit : 0;
    this._remainingPages = this._limit;
    debug('FollowLinkPaginator instance created.');
    debug('selector', this._selector);
    debug('limit', this._limit);
  }

  /**
   * Runs the processor: use the (last) run context of the parser to find the "next" link element.
   * It expects the parser to provide a Cheerio/jQuery-like object that has loaded the HTML.
   * Returns null when the last page is reached.
   * @param {Object} [loaderRunContext]
   * @param {Object} [loaderRunContext.params]
   * @param {Object} parserRunContext
   * @param {Cheerio} parserRunContext.$
   * @return {null|Object}
   */
  run(loaderRunContext = {}, parserRunContext) {
    const $ = parserRunContext.$;

    // only the 1st found because pagination appears usually on top and bottom of the page
    const $followLink = $(this._selector).first();
    if (!$followLink.length) {
      debug('Nothing to do, no "%s" link element found.', this._selector);
      return null;
    }

    const nextUrl = $followLink.attr('href');
    if (!nextUrl) {
      debug('Nothing to do, empty "href" attribute on the link element.');
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


module.exports = FollowLinkPaginator;
