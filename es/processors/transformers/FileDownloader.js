const path = require('path');
const fs = require('fs');
const nodeUrl = require('url');
const crypto = require('crypto');
const Bluebird = require('bluebird');
const axios = require('axios');
const parseContentDisposition = require('content-disposition').parse;
const mime = require('mime');
const uuid = require('uuid');
const pad = require('pad-left');
const debug = require('debug')('jason:transform:download-file');

const MB = 1024 * 1024;
const REGEXP_UUID = /%uuid%/g;
const REGEXP_HASH = /%hash%/g;
const REGEXP_NUM = /%num%/g;
const REGEXP_NAME = /%name%/g;

/**
 * A processor that downloads files.
 */
class FileDownloader {
  /**
   * @param {Object} config
   * @param {string} [config.baseURL='']
   * @param {string} [config.key=''] The key where the download url can be found in the input data
   * @param {string} [config.folder='.'] The output folder
   * @param {string} [config.name='%name%'] The pattern used to create the filenames:
   * %name%, %num%, %uuid%, %hash%
   * @param {Object} [config.maxMbSize=1] The maximum size allowed, in Mb
   * @param {Object} [config.concurrency=1]
   */
  constructor(config) {
    this._httpClient = axios.create({ baseURL: config.baseURL, responseType: 'stream' });

    const folder = config.folder || '';
    this._outputFolder = path.join(process.cwd(), folder);
    this._namePattern = config.name || '%name%';

    this._key = config.key || '';

    this._maxMbSize = config.maxMbSize || 1;
    this._maxBytesSize = this._maxMbSize * MB;

    this._concurrency = config.concurrency > 0 ? config.concurrency : 1;

    debug('FileDownloader instance created.');
    debug('base URL=', config.baseURL);
    debug('output folder=', this._outputFolder);
    debug('filename pattern=', this._namePattern);
    debug('download URL key=', this._key);
    debug('max size in Mb=', this._maxMbSize);
    debug('concurrency=', this._concurrency);
  }

  /**
   * @param {Object} results
   * @return {Promise}
   */
  run(results) {
    if (!results) {
      debug('No results to download!');
      return Promise.resolve();
    }

    const rootKey = Object.keys(results)[0];
    const data = results[rootKey];
    const urls = this._key ? data.map(r => r[this._key]) : data;
    const urlsCount = urls.length;

    debug('Downloading %d file(s) to "%s" with concurrency=%d...', urlsCount, this._outputFolder, this._concurrency);

    return Bluebird.map(
      urls,
      (url, index) => this._download(url, index, urlsCount),
      { concurrency: this._concurrency },
    );
  }

  /**
   * @param {string} url
   * @param {number} currentCount
   * @param {number} totalCount
   * @return {Promise.<string>|Promise.<Error>}
   */
  _download(url, currentCount, totalCount) {
    debug('Dowloading "%s"...', url);

    return this._httpClient
      .get(url)
      .then(response => this._checkResponseContent(url, response))
      .then((response) => {
        const filename = this._buildFilename(url, response.headers, currentCount, totalCount);
        return this._saveFile(filename, response);
      })
      .catch((error) => {
        debug(error.message);
        return Promise.resolve(error); // reflect to avoid Promise.all() to fail
      });
  }

  /**
   * @param {string} url
   * @param {HttpResponse} response
   * @return {null|Error}
   */
  _checkResponseContent(url, response) {
    debug('Response headers received.', response.headers);

    const contentLength = response.headers['content-length'];

    if (contentLength > this._maxBytesSize) {
      const error = new Error(`"${url}" too large (${contentLength} bytes), max=${this._maxBytesSize} bytes!`);
      return Promise.reject(error);
    }

    return response;
  }

  /**
   * @param {string} fileUrl
   * @param {Object} headers
   * @param {number} currentCount
   * @param {number} totalCount
   * @return {string}
   */
  _buildFilename(fileUrl, headers, currentCount, totalCount) {
    const parsedUrl = nodeUrl.parse(fileUrl);
    const baseNameFromUrl = path.parse(parsedUrl.pathname).name;

    const name = [
      FileDownloader.replacers.name.bind(null, baseNameFromUrl),
      FileDownloader.replacers.num.bind(null, currentCount, totalCount),
      FileDownloader.replacers.uuid,
      FileDownloader.replacers.hash,
    ].reduce(
      (currentName, replacer) => replacer(currentName),
      this._namePattern,
    );

    const ext = this._getFileExtensionFromHeaders(headers);
    const filename = `${name}${ext}`;

    return filename;
  }

  /**
   * @param {Object} headers
   */
  _getFileExtensionFromHeaders(headers) { // eslint-disable-line
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
   * @return {Promise.<string>|Promise.<Error>}
   */
  _saveFile(filename, response) {
    return new Promise((resolve, reject) => {
      const filepath = path.join(this._outputFolder, filename);
      debug('Saving "%s"...', filename);

      response.data.pipe(fs.createWriteStream(filepath))
        .on('error', (error) => {
          debug(error.message);
          reject(error);
        })
        .on('end', () => {
          resolve(filepath);
        });
    });
  }
}

FileDownloader.replacers = {
  name: (name, namePattern) => namePattern.replace(REGEXP_NAME, name),
  num: (num, totalNum, namePattern) => {
    const padCount = Math.ceil(Math.log10(totalNum));
    return namePattern.replace(REGEXP_NUM, pad(num, padCount, '0'));
  },
  uuid: namePattern => namePattern.replace(REGEXP_UUID, uuid()),
  hash: (namePattern) => {
    const md5Hash = crypto.createHash('md5').update(namePattern).digest('hex');
    return namePattern.replace(REGEXP_HASH, md5Hash);
  },
};

module.exports = FileDownloader;
