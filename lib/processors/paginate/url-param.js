const debug = require('debug')('jason:paginate');

class UrlParamPaginator {

  constructor(config) {
    this._paramName = config.param;
    this._limit = config.limit > 0 ? config.limit : 0;
    this._remainingPages = this._limit;
    debug('UrlParamPaginator instance created.');
    debug('param name', this._paramName);
    debug('limit', this._limit);
  }

  run(loaderContext/* , parserContext */) {
    const newParams = Object.assign({}, loaderContext.params);
    const paramValue = newParams[this._paramName];
    const currentPageNumber = paramValue ? Number(paramValue) : 0;
    const nextPageNumber = currentPageNumber + 1;

    if (--this._remainingPages > 0) {
      newParams[this._paramName] = nextPageNumber;
      debug('Page #%d, going to page #%d... %d page(s) to go.', currentPageNumber, nextPageNumber, this._remainingPages, newParams);
      return { params: newParams };
    }

    debug('Last page #%d reached - %d page(s) in total.', currentPageNumber, this._limit);
    return null;
  }

}

module.exports = UrlParamPaginator;
