const debug = require('debug')('jason:identity');

/**
 * A special kind of processor... that returns the input it received.
 */
class IdentityProcessor {
  /**
   * @param  {Object} config
   * @param  {Object} config.data
   */
  constructor({ config, category }) {
    this._config = config;
    this._category = category;
    debug('IdentityProcessor instance created.');
    debug('config', config);
    debug('category', category);
  }

  /**
   * We ensure the return values compliant with the different categories of processors
   * @param {Object} [data] Optional data to parse.
   * @param {Object} [results] Optional results to transform.
   * @return {Promise}
   */
  // eslint-disable-next-line class-methods-use-this
  async run({ data, results }) {
    const staticConfigData = this._config.data;

    if (staticConfigData) {
      debug('Returning static data from the config:');
      debug(staticConfigData);
    } else if (data) {
      debug('Returning data received from the loader:');
      debug(data);
    } else if (results) {
      debug('Returning data received from the parser:');
      debug(results);
    }

    if (this._category === 'load') {
      return staticConfigData;
    }

    if (this._category === 'parse') {
      const resultData = staticConfigData || data;
      return {
        // the parser is expected to produce result as an object ;)
        result: { data: resultData },
        schema: null,
        follows: [],
        paginates: [],
      };
    }

    // transform category
    return { results };
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
  // eslint-disable-next-line class-methods-use-this
  buildPaginationLinks() {
    return ['*']; // Force Jason to do one crawl
  }

  /**
   * Builds new load options. Used for following/paginating.
   * @param {string} link
   * @return {Object}
   */
  // eslint-disable-next-line class-methods-use-this
  buildLoadOptions() {
    return this._config.data;
  }
}

module.exports = IdentityProcessor;
