const axios = require('axios');
const debug = require('debug')('jason:input');

/**
 * A processor that loads data by making HTTP requests. Depends on the "axios" package.
 * @see https://github.com/mzabriskie/axios
 */
class HttpClient {
  /**
   * @param {Object} config
   * @param {string} ... See the "axios" package for all possible options.
   */
  constructor(config) {
    this._httpClient = axios.create(config);
    debug('HttpClient instance created.');
    debug('defaults', JSON.stringify(this._httpClient.defaults));
  }

  /**
   * Returns the current/last run context. It can be used by the paginators to do their job.
   * @return {Object}
   */
  getRunContext() {
    return this._httpClient.defaults;
  }

  /**
   * @return {Promise.<string>|Promise.<Error>}
   */
  run(config = {}) {
    Object.assign(this._httpClient.defaults, config);
    debug('Requesting data from "%s"...', this._httpClient.defaults.url, this._httpClient.defaults.params);

    return this._httpClient.request()
      .then(response => {
        debug('Response received: %s (%d).', response.statusText, response.status);
        return Promise.resolve(response.data);
      })
      .catch(error => {
        debug('Error: %s!', error.message);
        // debug(error.response);
        return Promise.reject(error);
      });
  }
}

module.exports = HttpClient;
