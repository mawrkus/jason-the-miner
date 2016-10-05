const axios = require('axios');
const debug = require('debug')('jason:input');

class HttpClient {

  constructor(config) {
    this._httpClient = axios.create(config);
    debug('HttpClient instance created.');
    debug('defaults', JSON.stringify(this._httpClient.defaults));
  }

  getRunContext() {
    return this._httpClient.defaults;
  }

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
