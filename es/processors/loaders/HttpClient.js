const nodeUrl = require('url');
const path = require('path');
const axios = require('axios');
const debug = require('debug')('jason:load:http');

const REGEX_ABSOLUTE_LINK = /^https?:\/\//;

/**
 * Requests data via HTTP. Depends on the "axios" package.
 * @see https://github.com/mzabriskie/axios
 */
class HttpClient {
  /**
   * @param {Object} config The config object
   * @param {*} config.*
   * Keys prefixed with "_" will be used for the loader own configuration.
   * Other keys will be used as axios options.
   * @param {number} [config._concurrency=1] The concurrency limit when following links and/or
   * paginating.
   */
  constructor(config) {
    this._httpConfig = {};
    this._config = {};

    Object.keys(config).forEach((key) => {
      if (key[0] !== '_') {
        this._httpConfig[key] = config[key];
      } else {
        this._config[key.slice(1)] = config[key];
      }
    });

    this._httpClient = axios.create(this._httpConfig);
    this._config = { concurrency: 1, ...this._config };
    this._config.concurrency = Number(this._config.concurrency); // just in case
    this._lastHttpConfig = this._httpConfig;

    debug('HttpClient instance created.');
    debug('HTTP config', this._httpConfig);
    debug('config', this._config);
  }

  /**
   * @param {Object} [httpConfig] An optional HTTP config, used when following/paginating.
   * @return {Promise.<string>|Promise.<Error>}
   */
  async run(httpConfig) {
    try {
      this._lastHttpConfig = { ...this._lastHttpConfig, ...httpConfig };

      this._logRequest(this._lastHttpConfig);

      const response = await this._httpClient.request(this._lastHttpConfig);

      this._logResponse(response);

      return response.data;
    } catch (requestError) {
      if (requestError.response) {
        this._logResponse(requestError.response);
      } else {
        debug(requestError.message);
      }

      throw requestError;
    }
  }

  /**
   * @param  {Object} request
   */
  // eslint-disable-next-line class-methods-use-this
  _logRequest({ method = 'get', url, params = '' }) {
    debug('%s %s...', method.toUpperCase(), url, params);
  }

  /**
   * @param  {Object} response
   */
  // eslint-disable-next-line class-methods-use-this
  _logResponse(response) {
    const {
      config,
      status,
      statusText,
      headers,
    } = response;

    const { method = 'get', url, params = '' } = config;

    const contentLength = headers['content-length'] !== undefined ?
      headers['content-length'] :
      '?';

    debug('%s %s: %s (%d)', method.toUpperCase(), url, statusText, status, params);
    debug('%s "%s" chars received.', contentLength, headers['content-type']);
  }

  /**
   * Returns the config . Used for following/paginating.
   * @return {Object}
   */
  getConfig() {
    return this._config;
  }

  /**
   * Builds a new load config. Used for following/paginating.
   * @param {string} link
   * @return {Object}
   */
  buildLoadParams({ link }) {
    const loadParams = { ...this._lastHttpConfig };

    if (link[0] === '/') {
      loadParams.url = link;
    } else if (link.match(REGEX_ABSOLUTE_LINK)) {
      loadParams.baseURL = link;
      loadParams.url = '';
    } else {
      const { pathname } = nodeUrl.parse(loadParams.url);
      loadParams.url = path.join(pathname, link);
    }

    return loadParams;
  }
}

module.exports = HttpClient;
