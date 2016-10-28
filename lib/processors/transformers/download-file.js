const path = require('path');
const fs = require('fs');
const url = require('url');
const crypto = require('crypto');
const PromiseThrottle = require('promise-throttle');
const axios = require('axios');
const parseContentDisposition = require('content-disposition').parse;
const mime = require('mime');
const uuid = require('uuid');
const pad = require('pad-left');
const debug = require('debug')('jason:transform:download');

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
   * @param {string} [config.key=''] The name of the property of the input data to use as
   * URL for downloading
   * @param {string} [config.folder='.'] The output folder
   * @param {string} [config.name='%name%'] The pattern used to create the filenames:
   * %name%, %num%, %uuid%, %hash%
   * @param {Object} [config.maxsize=1] The maximum size allowed, in Mb
   * @param {Object} [config.rps=0] The maximum number of requests per second
   */
  constructor(config) {
    this._httpClient = axios.create({ baseURL: config.baseURL, responseType: 'stream' });

    const folder = config.folder || '';
    this._outputFolder = path.join(process.cwd(), folder);
    this._namePattern = config.name || '%name%';

    this._key = config.key || '';

    this._maxMbSize = config.maxsize || 1;
    this._maxBytesSize = this._maxMbSize * MB;

    this._rps = config.rps;
    if (this._rps > 0) {
      const promiseThrottle = new PromiseThrottle({ requestsPerSecond: this._rps });
      this._throttler = promiseThrottle.add.bind(promiseThrottle);
    } else {
      this._throttler = fn => fn();
    }

    debug('FileDownloader instance created.');
    debug('base URL', config.baseURL);
    debug('output folder', this._outputFolder);
    debug('filename pattern', this._namePattern);
    debug('key', this._key);
    debug('max size in Mb', this._maxMbSize);
    debug('max req/s', this._rps > 0 ? this._rps : 'disabled');
  }

  /**
   * @param {Object[]} results
   * @return {Promise.<Object[]>|Promise.<Error>|Promise.<string>}
   */
  run(results) {
    const schemas = Object.keys(results);

    const schemasP = schemas.map(name => {
      const schemaResults = results[name];
      if (!schemaResults) {
        debug('No results from schema "%s".', name);
        return Promise.resolve();
      }

      const urls = schemaResults.map(result => (this._key ? result[this._key] : result));
      const urlsCount = urls.length;

      debug('Downloading %d file(s) from "%s" schema to "%s"...', urlsCount, name, this._outputFolder);

      const downloadP = urls.map((url, index) => {
        return this._throttler(() => this._download(url, index, urlsCount));
      });

      return Promise.all(downloadP).then(files => ({ [name]: files }));
    });

    return Promise.all(schemasP);
  }

  /**
   * @param {string} url
   * @param {number} currentCount
   * @param {number} totalCount
   * @return {Promise.<string>|Promise.<Error>}
   */
  _download(url, currentCount, totalCount) {
    debug('Dowloading "%s"...', url);

    return this._httpClient.get(url)
      .then(response => this._checkResponseContent(url, response))
      .then(response => {
        const filename = this._buildFilename(url, response.headers, currentCount, totalCount);
        return this._saveFile(filename, response);
      })
      .catch(error => {
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
      const error = new Error(`"${url}" too large, max=${this._maxBytesSize} bytes!`);
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
    const parsedUrl = url.parse(fileUrl);
    const baseNameFromUrl = path.parse(parsedUrl.pathname).name;

    const name = [
      FileDownloader.replacers.name.bind(null, baseNameFromUrl),
      FileDownloader.replacers.num.bind(null, currentCount, totalCount),
      FileDownloader.replacers.uuid,
      FileDownloader.replacers.hash
    ].reduce((name, replacer) => replacer(name), this._namePattern);

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
        .on('error', error => {
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
    totalNum = 11;
    const padCount = Math.ceil(Math.log10(totalNum));
    return namePattern.replace(REGEXP_NUM, pad(num, padCount, '0'));
  },

  uuid: namePattern => namePattern.replace(REGEXP_UUID, uuid()),

  hash: namePattern => {
    const md5Hash = crypto.createHash('md5').update(namePattern).digest('hex');
    return namePattern.replace(REGEXP_HASH, md5Hash);
  }
};

module.exports = FileDownloader;
