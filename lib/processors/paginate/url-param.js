const debug = require('debug')('jason:paginate:param');

/**
 * A processor that manages the pagination by incrementing the value of a given URL parameter.
 */
class UrlParamPaginator {
  /**
   * @param {Object} config
   * @param {string} config.param The name of the URL parameter
   * @param {string} [config.inc=1] The increment to add to the current value ot the URL parameter
   * @param {number} [config.limit=0] The maximum number of pages to process
   */
  constructor(config) {
    this._paramName = config.param;
    this._inc = config.inc > 0 ? config.inc : 1;
    this._limit = config.limit > 0 ? config.limit : 0;
    this._remainingPages = this._limit;
    debug('UrlParamPaginator instance created.');
    debug('param name', this._paramName);
    debug('inc', this._inc);
    debug('limit', this._limit);
  }

  /**
   * Runs the processor: increments the value of the URL parameter specified in the config.
   * The current value of the parameter is obtained from the (last) run context of the loader (an
   * object containing the current load "params").
   * Returns null when the limit of pages is reached.
   * @param {Object} loaderRunContext
   * @param {Object} loaderRunContext.params
   * @param {Object} [parserRunContext={}]
   * @return {null|Object} An object containing the new load params
   */
  run({ loaderRunContext, parserRunContext } = {}) { // eslint-disable-line
    if (--this._remainingPages > 0) {
      const newParams = Object.assign({}, loaderRunContext.params);
      let currentParamValue = newParams[this._paramName];
      currentParamValue = currentParamValue ? Number(currentParamValue) : 0;

      newParams[this._paramName] = currentParamValue + this._inc;

      debug('%d page(s) to go.', this._remainingPages, newParams);
      return { params: newParams };
    }

    debug('Last page reached - %d page(s) in total.', this._limit);
    return null;
  }
}

module.exports = UrlParamPaginator;
