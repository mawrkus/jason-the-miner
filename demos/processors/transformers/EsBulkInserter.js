const debug = require('debug')('jason:transform:es-bulk-inserter');
const HttpClient = require('../../../es/processors/loaders/HttpClient');

class EsBulkInserter {
  /**
   * @param {Object} config
   */
  constructor({ config }) {
    this._config = { ...config };

    const httpConfig = {
      url: `${this._config.url}/_bulk`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-ndjson',
      },
    };
    this._httpClient = new HttpClient({ config: httpConfig });

    debug('EsBulkInserter instance created.');
    debug('config', this._config);
  }

  /**
   * @param {Object} results
   * @param {Object[]} results.data
   * @return {Promise}
   */
  async run({ results }) {
    const rootKey = Object.keys(results)[0];
    const docs = Array.isArray(results) ? results : (results[rootKey] || []);
    const ndJson = this._transformDocsToNdJson(docs);

    debug('Inserting %d document(s) to Elasticsearch...', docs.length);

    const httpOptions = { data: ndJson };
    const esResponse = await this._httpClient.run({ options: httpOptions });
    const { took, errors, items } = esResponse;

    debug('%d/%d document(s) processed in %dms.', items.length, docs.length, took);
    if (errors) {
      debug(errors);
    }

    return { results: esResponse };
  }

  /**
   * @param {Object[]} docs
   * @return {string}
   */
  // eslint-disable-next-line class-methods-use-this
  _transformDocsToNdJson(docs) {
    const { index, type = '_doc' } = this._config;
    let ndJson = '';

    debug('Converting %d document(s) to NDJSON -> index="%s", type="%s"...', docs.length, index, type);

    docs.forEach((doc) => {
      const actionAndMeta = `{"index":{"_index":"${index}","_type":"${type}"}}`;
      const source = JSON.stringify(doc);
      ndJson += `${actionAndMeta}\n${source}\n`;
    });

    return ndJson;
  }
}

module.exports = EsBulkInserter;
