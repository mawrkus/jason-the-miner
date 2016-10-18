const axios = require('axios');
const debug = require('debug')('jason:input:http');
const PromiseThrottle = require('promise-throttle');

/**
 * Requests data via HTTP. Depends on the "axios" package.
 * @see https://github.com/mzabriskie/axios
 */
class HttpClient {
  /**
   * @param {Object} config See the "axios" package for all possible options.
   * @param {Object} [config.rps=0]
   */
  constructor(config) {
    this._rps = config.rps;
    delete config.rps; // do not mess with Axios options
    if (this._rps > 0) {
      this._promiseThrottle = new PromiseThrottle({ requestsPerSecond: this._rps });
    } else {
      this._rps = 0;
      this._promiseThrottle = { add: fn => fn() };
    }
    this._httpClient = axios.create(config);
    debug('HttpClient instance created.');
    debug('defaults', JSON.stringify(this._httpClient.defaults));
    debug('max req/s', !this._rps ? 'disabled' : this._rps);
  }

  /**
   * @param {Object} [config={}] An optional config, can be passed by a paginator.
   * @return {Promise.<string>|Promise.<Error>}
   */
  run(config = {}) {
    debug('Requesting data from "%s"...', this._httpClient.defaults.url, this._httpClient.defaults.params);

    return this._promiseThrottle.add(() => {
      Object.assign(this._httpClient.defaults, config);

      return this._httpClient.request()
        .then(response => {
          debug('Response received from "%s": %s (%d).', this._httpClient.defaults.url, response.statusText, response.status);
          return Promise.resolve(response.data);
        })
        .catch(error => {
          debug(error.message);
          return Promise.reject(error);
        });
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
