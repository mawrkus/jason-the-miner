const path = require('path');
const fs = require('fs');
const nodeUrl = require('url');
const crypto = require('crypto');
const Bluebird = require('bluebird');
const axios = require('axios');
const parseContentDisposition = require('content-disposition').parse;
const mime = require('mime');
const uuid = require('uuid');
const padLeft = require('pad-left');
const get = require('lodash.get');
const debug = require('debug')('jason:transform:download-file');

const MB = 1024 * 1024;
const REGEX_UUID = /{uuid}/g;
const REGEX_HASH = /{hash}/g;
const REGEX_INDEX = /{index}/g;
const REGEX_NAME = /{name}/g;

/**
 * A processor that downloads files.
 */
class FileDownloader {
  /**
   * @param {Object} config
   * @param {string} [config.baseURL]
   * @param {string} [config.folder='.'] The output folder
   * @param {string} [config.namePattern='{name}'] The pattern used to create the filenames:
   * {name}, {index}, {uuid}, {hash}
   * @param {string} [config.parseSelector] The selector to retrieve the download urls in the array of parsed data
   * @param {Object} [config.maxSizeInMb=1]
   * @param {Object} [config.concurrency=1]
   */
  constructor({ config = {} } = {}) {
    this._config = {
      folder: '',
      namePattern: '{name}',
      maxSizeInMb: 1,
      concurrency: 1,
      ...config,
    };
    this._config.concurrency = Number(this._config.concurrency); // just in case

    this._httpConfig = { baseURL: this._config.baseURL, responseType: 'stream' };
    this._httpClient = axios.create(this._httpConfig);

    this._outputFolder = path.join(process.cwd(), this._config.folder);
    this._maxBytesSize = this._maxMbSize * MB;

    debug('FileDownloader instance created.');
    debug('HTTP config', this._httpConfig);
    debug('config', this._config);
  }

  /**
   * @param {Object} results The results from the previous transformer if any, or the
   * parse results by default
   * @param {Object} parseResults The original parse results
   * @return {Promise}
   */
  async run({ results }) {
    if (!results) {
      debug('No results to download!');
      return [];
    }

    const rootKey = Object.keys(results)[0];
    const downloads = Array.isArray(results) ? results : (results[rootKey] || []);
    const { parseSelector, concurrency } = this._config;

    const urls = parseSelector ? downloads.map(d => get(d, parseSelector)).filter(Boolean) : downloads;
    const total = urls.length;

    debug('Found %d file(s) to download at max concurrency=%d...', total, concurrency);
    // debug(urls);

    const filePaths = await Bluebird.map(
      urls,
      (url, index) => this._download({ url, index, total }),
      { concurrency },
    );

    return { results, filePaths };
  }

  /**
   * @param {string} url
   * @param {number} index
   * @param {number} total
   * @return {Promise}
   */
  async _download({ url, index, total }) {
    debug('Dowloading "%s" (%d/%d)...', url, index + 1, total);

    try {
      const response = await this._httpClient.get(url);
      const { headers } = response;

      this._checkContentLength({ url, headers });

      const filename = this._buildFilename({
        url,
        headers,
        index,
        total,
      });

      return this._saveFile({ filename, response });
    } catch (error) {
      debug(error.message);
      return error; // reflect to avoid Bluebird.map() to fail
    }
  }

  /**
   * @param {string} url
   * @param {Object} headers
   */
  _checkContentLength({ url, headers }) {
    const contentLength = Number(headers['content-length']);

    if (contentLength > this._maxBytesSize) {
      const error = new Error(`"${url}" too large (${contentLength} bytes received, max=${this._maxBytesSize} bytes)!`);
      throw error;
    }
  }

  /**
   * @param {string} fileUrl
   * @param {Object} headers
   * @param {number} currentCount
   * @param {number} total
   * @return {string}
   */
  _buildFilename({
    url,
    headers,
    index,
    total,
  }) {
    const parsedUrl = nodeUrl.parse(url);
    const { name: baseNameFromUrl } = path.parse(parsedUrl.pathname);

    const name = [
      FileDownloader.replacers.name.bind(null, baseNameFromUrl),
      FileDownloader.replacers.index.bind(null, index, total),
      FileDownloader.replacers.uuid,
      FileDownloader.replacers.hash,
    ].reduce(
      (currentName, replacer) => replacer(currentName),
      this._config.namePattern,
    );

    const ext = this._getFileExtensionFromHeaders({ headers });
    const fileName = `${name}${ext}`;

    return fileName;
  }

  /**
   * @param {Object} headers
   * @return {string}
   */
  // eslint-disable-next-line class-methods-use-this
  _getFileExtensionFromHeaders({ headers }) {
    const contentDisposition = headers['content-disposition'];
    if (contentDisposition) {
      const parsedDisposition = parseContentDisposition(contentDisposition);

      if (parsedDisposition.parameters && parsedDisposition.parameters.filename) {
        const extension = path.parse(parsedDisposition.parameters.filename).ext;
        return extension.toLowerCase();
      }
    }

    const contentType = headers['content-type'];
    const extension = `.${mime.extension(contentType)}`;

    return extension;
  }

  /**
   * @param {string} filename
   * @param {HttpResponse} response
   * @return {Promise}
   */
  async _saveFile({ filename, response }) {
    return new Promise((resolve, reject) => {
      const filePath = path.join(this._outputFolder, filename);
      debug('Saving file "%s"...', filePath);

      response.data.pipe(fs.createWriteStream(filePath));

      response.data
        .on('error', (error) => {
          debug(error.message);
          reject(error);
        })
        .on('end', () => {
          debug('File "%s" saved!', filePath);
          resolve(filePath);
        });
    });
  }
}

FileDownloader.replacers = {
  name: (name, namePattern) => namePattern.replace(REGEX_NAME, name),
  index: (index, total, namePattern) => {
    const padCount = Math.ceil(Math.log10(total));
    return namePattern.replace(REGEX_INDEX, padLeft(index, padCount, '0'));
  },
  uuid: namePattern => namePattern.replace(REGEX_UUID, uuid()),
  hash: (namePattern) => {
    const hash = crypto.createHash('sha256').update(namePattern).digest('hex');
    return namePattern.replace(REGEX_HASH, hash);
  },
};

module.exports = FileDownloader;
