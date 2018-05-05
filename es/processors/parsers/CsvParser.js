const parse = require('csv-parse/lib/sync')
const debug = require('debug')('jason:parse:csv');

/**
 * Parses CSV. Depends on the "csv-parse" package.
 * @see https://github.com/adaltas/node-csv-parse
 */
class CsvParser {
  /**
   * @param  {Object} config
   * @param {*} config.*
   */
  constructor({ config }) {
    this._config = config || {};
    debug('CsvParser instance created.');
    debug('config', this._config);
  }

  /**
   * Runs the processor: parses the CSV passed as parameter using the current config.
   * @param {string} data
   * @return {Promise.<Object>}
   */
  async run({ data: csv }) {
    debug('Parsing...');
    const start = Date.now();

    const result = parse(csv, this._config);

    const elapsed = Date.now() - start;
    debug('Done parsing CSV in %dms.', elapsed);

    return {
      result: { result },
      schema: null,
      follows: [],
      paginates: [],
    };
  }
}

module.exports = CsvParser;
