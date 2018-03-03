const debug = require('debug')('jason:paginate:url-param');

/**
 * Paginates by incrementing the value of a given URL parameter.
 */
class UrlParamPaginator {
  /**
   * @param {Object} config
   * @param {string} config.param The name of the URL parameter
   * @param {string} [config.inc=1] The increment to add to the current value ot the URL parameter
   * @param {number} [config.max=1] The maximum value allowed for the URL parameter
   * @param {Object} [config.concurrency=1]
   */
  constructor(config) {
    this._paramName = config.param;
    this._inc = config.inc > 0 ? config.inc : 1;
    this._max = config.max > 1 ? config.max : 1;
    this._concurrency = config.concurrency > 0 ? config.concurrency : 1;
    this._done = false;
    this._remainingPages = 0;

    debug('UrlParamPaginator instance created.');
    debug('param name', this._paramName);
    debug('inc', this._inc);
    debug('max', this._max);
    debug('concurrency', this._concurrency);
  }

  /**
   * Runs the processor: increments the value of the URL parameter specified in the config.
   * The current value of the parameter is obtained from the (last) run context of the loader (an
   * object containing the current load "params").
   * Returns null when the max value of the URL parameter is reached.
   * @param {Object} loaderRunContext
   * @param {Object} loaderRunContext.params
   * @param {Object} [parserRunContext={}]
   * @return {null|{ runConfigs, throttler }}
   */
  run({ loaderRunContext, parserRunContext } = {}) { // eslint-disable-line
    if (this._done) {
      debug('%d page(s) left.', --this._remainingPages);
      return null;
    }

    const runConfigs = [];
    let params = Object.assign({}, loaderRunContext.params);
    let paramValue = Number(params[this._paramName]) || 0;

    debug('Param "%s"=%d', this._paramName, paramValue);

    while ((paramValue + this._inc) <= this._max) {
      paramValue += this._inc;
      params = Object.assign({}, params, { [`${this._paramName}`]: paramValue });
      runConfigs.push({ params });
      debug('New params=', params);
    }

    this._done = true;
    this._remainingPages = runConfigs.length;

    if (this._remainingPages) {
      debug('Prepared %d page(s) with a concurrency of %d.', this._remainingPages, this._concurrency);
    } else {
      debug('%d + %d >= %d, no pagination.', paramValue, this._inc, this._max);
    }

    return { runConfigs, concurrency: this._concurrency };
  }
}

module.exports = UrlParamPaginator;
