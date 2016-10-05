const debug = require('debug')('jason:paginate');

class FollowLinkPaginator {

  constructor(config) {
    this._selector = config.selector;
    this._limit = config.limit > 0 ? config.limit : 0;
    this._remainingPages = this._limit;
    debug('FollowLinkPaginator instance created.');
    debug('selector', this._selector);
    debug('limit', this._limit);
  }

  run(loaderContext, parserContext) {
    const $ = parserContext.$;

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
