const debug = require('debug')('jason:paginate:follow');

const REGEXP_SLICE_PARAMS = /\D*(\d+)\D*,\D*(\d+)/;

/**
 * Paginates by searching for links in the DOM.
 */
class FollowLinkPaginator {
  /**
   * @param {Object} config
   * @param {string} config.selector The selector that matches the link(s) to follow
   * @param {string} [config.slice]
   * @param {number} [config.mode="single"] "all" or "single"
   * @param {number} [config.limit=1] The maximum number of levels to process
   * @param {Object} [config.concurrency=1]
   */
  constructor(config) {
    this._selector = config.selector;
    const sliceMatch = (config.slice || '').match(REGEXP_SLICE_PARAMS);
    if (sliceMatch) {
      this._slice = [sliceMatch[1], sliceMatch[2]];
    }
    this._mode = config.mode === 'all' ? 'all' : 'single';
    this._limit = config.limit > 1 ? config.limit : 1;
    this._concurrency = config.concurrency > 0 ? config.concurrency : 1;
    this._iterationsCount = 0;

    debug('FollowLinkPaginator instance created.');
    debug('selector', this._selector);
    debug('slice', this._slice);
    debug('mode', this._mode);
    debug('limit', this._limit);
    debug('concurrency', this._concurrency);
  }

  /**
   * Runs the processor: uses the (last) run context of the parser to find the link(s) element(s).
   * It expects the parser to provide a Cheerio/jQuery-like object that has loaded the HTML.
   * Returns null when no "next" url is found or when the limit of pages is reached.
   * @param {Object} [loaderRunContext={}]
   * @param {Object} parserRunContext
   * @param {Cheerio} parserRunContext.$
   * @return {null|{ runConfigs, concurrency }}
   */
  run({ loaderRunContext, parserRunContext } = {}) { // eslint-disable-line
    if (this._iterationsCount++ >= this._limit) {
      debug('Last %s reached - %d page(s) in total.', this._mode === 'single' ? 'page' : 'level', this._iterationsCount);
      return null;
    }
    debug('Pagination %d/%d...', this._iterationsCount, this._limit);

    const $ = parserRunContext.$;

    if (this._mode === 'single') {
      const $link2Follow = $(this._selector).first();
      if (!$link2Follow.length) {
        debug('No link found for selector "%s", done - %d page(s) in total.', this._selector, this._iterationsCount);
        return null;
      }

      const url = $link2Follow.attr('href');
      if (!url) {
        debug('Empty "href" attribute on the link, done - %d page(s) in total.', this._iterationsCount);
        return null;
      }


      debug('Following link to "%s"...', url);
      return { runConfigs: [{ url }], concurrency: this._concurrency };
    }

    // all
    let $links2Follow = $(this._selector);
    let linksCount = $links2Follow.length;
    debug('Found %d link(s) to follow.', linksCount);

    if (this._slice) {
      $links2Follow = $links2Follow.slice(this._slice[0], this._slice[1]);
      linksCount = $links2Follow.length;
      debug('Slicing: [%d, %d[ -> %d link(s)', this._slice[0], this._slice[1], linksCount);
    }

    const urls = $links2Follow
      .map((index, el) => {
        const href = $(el).attr('href');
        return href && href.trim();
      })
      .get()
      .filter(Boolean)
      .map(url => ({ url }));

    debug('Prepared %d pages with a concurrency of %d.', urls.length, urls, this._concurrency);

    return { runConfigs: urls, concurrency: this._concurrency };
  }
}


module.exports = FollowLinkPaginator;
