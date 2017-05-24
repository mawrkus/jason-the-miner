const axios = require('axios');
const debug = require('debug')('jason:input:http');

/**
 * Requests data via HTTP. Depends on the "axios" package.
 * @see https://github.com/mzabriskie/axios
 */
class HttpClient {
  /**
   * @param {Object} config See the "axios" package for all possible options.
   */
  constructor(config) {
    this._httpClient = axios.create(config);
    debug('HttpClient instance created.');
    debug('defaults', JSON.stringify(this._httpClient.defaults));
  }

  /**
   * @param {Object} [config={}] An optional config, can be passed by a paginator.
   * @return {Promise.<string>|Promise.<Error>}
   */
  run(config = {}) {
    Object.assign(this._httpClient.defaults, config);
    const { method = 'get', url, params = '' } = this._httpClient.defaults;
    debug('%s "%s"...', method.toUpperCase(), url, params);

    return this._httpClient.request()
      .then(response => {
        const { config, status, statusText, data } = response;
        const { method = 'get', url, params = '' } = config;
        debug('%s "%s": %s (%d)', method.toUpperCase(), url, statusText, status, params);
        return Promise.resolve(data);
      })
      .catch(error => {
        debug(error.message);
        return Promise.reject(error);
      });
  }

  /**
   * Returns the current/last run context. It can be used by the paginators to do their job.
   * @return {Object}
   */
  getRunContext() {
    return this._httpClient.defaults;
  }
}

module.exports = HttpClient;
