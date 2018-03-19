const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const crypto = require('crypto');

const axios = require('axios');
const debug = require('debug')('jason:load:http');
const makeDir = require('make-dir');

const REGEX_PAGINATION_PARAMS = /[^{]*{\D*(\d+)\D*,\D*(\d+).*/;
const REGEX_PAGINATION_EXP = /{.+}/;
const REGEX_ABSOLUTE_LINK = /^https?:\/\//;

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

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

    if (this._config.cache) {
      this._setupCache();
    }
  }

  _setupCache() {
    const folderPath = path.join(process.cwd(), this._config.cache.folder);
    debug('Creating folder "%s"...', folderPath);
    makeDir.sync(folderPath);

    const originalRequest = this._httpClient.request.bind(this._httpClient);

    this._httpClient.request = async (args) => {
      const hash = crypto.createHash('sha256');
      const cacheKey = hash.update(JSON.stringify(args)).digest('hex');
      const cacheFile = path.join(folderPath, cacheKey);

      try {
        if (this._config.cache.refresh) {
          throw new Error('Force cache refresh!');
        }

        const response = await readFileAsync(cacheFile);
        debug('Response from cache file "%s".', cacheKey, args);

        return JSON.parse(response);
      } catch (readError) {
        debug('Response not from cache file "%s".', cacheKey, args, readError.toString());
        const response = await originalRequest(args);

        try {
          const cachedResponse = {
            config: response.config,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
          };

          await writeFileAsync(cacheFile, JSON.stringify(cachedResponse));
          debug('Cache file "%s" written.', cacheKey, args);
        } catch (writeError) {
          debug('Error writing cache file "%s"!', cacheKey, args, writeError.toString());
        }

        return response;
      }
    };

    debug('Cache set up at folder "%s".', folderPath);
  }

  /**
   * Returns the config. Used for limiting the concurrency when following/paginating.
   * @return {Object}
   */
  getConfig() {
    return this._config;
  }

  /**
   * Builds all the links defined by the pagination config.
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
}

module.exports = HttpClient;
