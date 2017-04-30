const debug = require('debug')('jason:paginate:param');

/**
 * Paginates by incrementing the value of a given URL parameter.
 */
class UrlParamPaginator {
  /**
   * @param {Object} config
   * @param {string} config.param The name of the URL parameter
   * @param {string} [config.inc=1] The increment to add to the current value ot the URL parameter
   * @param {number} [config.limit=1] The maximum number of pages to process
   * @param {number} [config.mode="sequential"] "parallel" or "sequential"
   * @param {Object} [config.concurrency=1]
   */
  constructor(config) {
    this._paramName = config.param;
    this._inc = config.inc > 0 ? config.inc : 1;
    this._limit = config.limit > 1 ? config.limit : 1;
    this._remainingPages = this._limit;
    this._concurrency = config.concurrency > 0 ? config.concurrency : 1;

    debug('UrlParamPaginator instance created.');
    debug('param name', this._paramName);
    debug('inc', this._inc);
    debug('limit', this._limit);
    debug('concurrency', this._concurrency);
  }

  /**
   * Runs the processor: increments the value of the URL parameter specified in the config.
   * The current value of the parameter is obtained from the (last) run context of the loader (an
   * object containing the current load "params").
   * Returns null when the limit of pages is reached.
   * @param {Object} loaderRunContext
   * @param {Object} loaderRunContext.params
   * @param {Object} [parserRunContext={}]
   * @return {null|{ runConfigs, throttler }}
   */
  run({ loaderRunContext, parserRunContext } = {}) { // eslint-disable-line
    if (this._remainingPages <= 0) {
      debug('Last page reached - %d page(s) in total.', this._limit + 1);
      return null;
    }

    const runConfigs = [];
    let params = loaderRunContext.params;

    while (this._remainingPages-- > 0) {
      params = this._getNewParams(params);
      runConfigs.push({ params });
    }

    debug('Prepared %d page(s).', runConfigs.length, runConfigs);

    return { runConfigs, concurrency: this._concurrency };
  }

  /**
   * @param {Object} loaderRunContext
   * @return {Object}
   */
  _getNewParams(params) {
    const newParams = Object.assign({}, params);
    let currentParamValue = newParams[this._paramName];
    currentParamValue = currentParamValue ? Number(currentParamValue) : 0;
    newParams[this._paramName] = currentParamValue + this._inc;
    return newParams;
  }
}

module.exports = UrlParamPaginator;
