const debug = require('debug')('jason:paginate');

/**
 * A processor that manages the pagination by incrementing the value of an URL parameter.
 */
class UrlParamPaginator {
  /**
   * @param {Object} config
   * @param {string} config.param The name of the URL parameter
   * @param {number} config.limit The maximum number of pages to process
   */
  constructor(config) {
    this._paramName = config.param;
    this._limit = config.limit > 0 ? config.limit : 0;
    this._remainingPages = this._limit;
    debug('UrlParamPaginator instance created.');
    debug('param name', this._paramName);
    debug('limit', this._limit);
  }

  /**
   * Runs the processor: increments the value of the URL parameter specified in the config.
   * The current value of the parameter is obtained from the (last) run context of the loader (an
   * object containing the current load "params").
   * Returns null when the last page is reached.
   * @param {Object} loaderRunContext
   * @param {Object} loaderRunContext.params
   * @param {Object} [parserRunContext]
   * @return {null|Object}
   */
  run(loaderRunContext, parserRunContext = {}) { // eslint-disable-line
    const newParams = Object.assign({}, loaderRunContext.params);
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
