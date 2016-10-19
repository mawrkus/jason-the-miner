const debug = require('debug')('jason:paginate:follow');

/**
 * Paginates by searching for links in the DOM.
 */
class FollowLinkPaginator {
  /**
   * @param {Object} config
   * @param {string} config.selector The selector that matches the link(s) to follow
   * @param {number} [config.limit=0] The maximum number of pages to process
   * @param {number} [config.mode="single"] "all" or "single"
   */
  constructor(config) {
    this._selector = config.selector;
    this._limit = config.limit > 0 ? config.limit : 0;
    this._iterationsCount = 0;
    this._mode = config.mode === 'all' ? 'all' : 'single';
    debug('FollowLinkPaginator instance created.');
    debug('selector', this._selector);
    debug('limit', this._limit);
    debug('mode', this._mode);
  }

  /**
   * Runs the processor: uses the (last) run context of the parser to find the link(s) element(s).
   * It expects the parser to provide a Cheerio/jQuery-like object that has loaded the HTML.
   * Returns null when no "next" url is found or when the limit of pages is reached.
   * @param {Object} [loaderRunContext={}]
   * @param {Object} parserRunContext
   * @param {Cheerio} parserRunContext.$
   * @return {null|Object[]}
   */
  run({ loaderRunContext, parserRunContext } = {}) { // eslint-disable-line
    if (++this._iterationsCount >= this._limit) {
      debug('Last page reached - %d %s(s) in total.', this._iterationsCount, this._mode === 'single' ? 'page' : 'level');
      return null;
    }

    const $ = parserRunContext.$;
    const remainingIterations = this._limit - this._iterationsCount;

    if (this._mode === 'single') {
      const $nextLink = $(this._selector).first();
      if (!$nextLink.length) {
        debug('No "%s" link found, done - %d page(s) in total.', this._selector, this._iterationsCount);
        return null;
      }

      const nextUrl = $nextLink.attr('href');
      if (!nextUrl) {
        debug('Empty "href" attribute on the link, done - %d page(s) in total.', this._iterationsCount);
        return null;
      }

      debug('Following link to "%s"... %d page(s) to go.', nextUrl, remainingIterations);
      return [{ url: nextUrl }];
    }

    // all
    const $nextLinks = $(this._selector);

    const nextUrls = $nextLinks
      .map((index, el) => $(el).attr('href')).get()
      .filter(Boolean)
      .map(url => ({ url }));

    debug('Found %d link(s), going to level #%d... %d level(s) to go.', nextUrls.length, this._iterationsCount, remainingIterations, nextUrls);
    return nextUrls.length ? nextUrls : null;
  }
}


module.exports = FollowLinkPaginator;
