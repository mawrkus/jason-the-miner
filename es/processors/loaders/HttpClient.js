const axios = require('axios');
const Bluebird = require('bluebird');
const debug = require('debug')('jason:load:http');

const REGEX_PAGINATION_PARAMS = /[^{]*{\D*(\d+)\D*,\D*(\d+).*/;
const REGEX_PAGINATION_EXP = /{.+}/;
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
    this._lastHttpConfig = this._httpConfig;

    this._config = { concurrency: 1, ...this._config };
    this._config.concurrency = Number(this._config.concurrency); // just in case

    debug('HttpClient instance created.');
    debug('HTTP config', this._httpConfig);
    debug('config', this._config);
  }

  /**
   * @return {Array}
   */
  buildPaginationLinks() {
    const paginationParams = this._httpConfig.url.match(REGEX_PAGINATION_PARAMS);

    if (!paginationParams) {
      return [this._httpConfig.url];
    }

    const links = [];

    const [startPage, endPage] = paginationParams.slice(1, 3).map(Number);
    let n = startPage;

    while (n <= endPage) {
      const url = this._httpConfig.url.replace(REGEX_PAGINATION_EXP, n);
      links.push(url);
      n += 1;
    }

    return links;
  }

  /**
   * @param {Object} [options] Optional HTTP options, used when following/paginating.
   * @return {Promise}
   */
  async run({ options }) {
    this._lastHttpConfig = { ...this._lastHttpConfig, ...options };

    try {
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
  _logRequest(request) {
    const {
      method = 'get',
      baseURL = '',
      url = '',
      params = '',
    } = request;
    debug('%s %s%s...', method.toUpperCase(), baseURL, url, params);
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
    debug('%s chars of "%s" received.', contentLength, headers['content-type']);
  }

  /**
   * Returns the config . Used for following/paginating.
   * @return {Object}
   */
  getConfig() {
    return this._config;
  }

  /**
   * Builds new load options. Used for following/paginating.
   * @param {string} link
   * @return {Object}
   */
  buildLoadOptions({ link }) {
    const loadParams = { ...this._lastHttpConfig };

    if (link.match(REGEX_ABSOLUTE_LINK)) {
      loadParams.baseURL = link;
      loadParams.url = '';
    } else {
      loadParams.url = link;
    }

    return loadParams;
  }
}

module.exports = HttpClient;
