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
    debug('Requesting data from "%s"...', this._httpClient.defaults.url, this._httpClient.defaults.params);

    return this._httpClient.request()
      .then(response => {
        debug('Response received from "%s": %s (%d).', this._httpClient.defaults.url, response.statusText, response.status);
        return Promise.resolve(response.data);
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
