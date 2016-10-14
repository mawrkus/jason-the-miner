const get = require('lodash.get');
const debug = require('debug')('jason:parse:json');

/**
 * Parses JSON. Depends on the "loadsh.get" package.
 * @see https://www.npmjs.com/package/lodash.get
 */
class JsonParser {
  /**
   * @param  {Object} config The processor configuration
   * @param  {Object[]} [config.schemas=[]] The parse schemas
   */
  constructor(config) {
    this._schemas = config.schemas || [];
    debug('JsonParser instance created.');
    debug('schemas', this._schemas);
  }

  /**
   * Runs the processor: parses the JSON passed as parameter using the schema(s) defined in the
   * configuration.
   * @param {Object} json
   * @return {Promise.<Object[]>}
   */
  run(json) {
    const schemasCount = this._schemas.length;
    const results = [];

    this._schemas.forEach((schema, schemaIndex) => {
      debug('Parsing schema %d/%d...', schemaIndex + 1, schemasCount);
      const path = Object.keys(schema)[0];
      const parts = schema[path];
      const partsNames = Object.keys(parts);
      let elements = get(json, path) || [];
      if (!Array.isArray(elements)) {
        elements = [elements];
      }

      debug(' Found %d element(s) for path "%s".', elements.length, path);
      elements.forEach((element, elementIndex) => {
        const newItem = {};

        debug('  #%d -> extracting parts...', elementIndex);
        partsNames.forEach(partName => {
          const partPath = parts[partName];
          debug('   Extracting "%s" value using path "%s"...', partName, partPath);

          const partValue = partPath ? get(element, partPath) : element;
          debug('     Value="%s"', partValue);
          newItem[partName] = partValue;
        });

        results.push(newItem);
      });

      debug('Done parsing schema %d/%d.', schemaIndex + 1, schemasCount);
    });

    debug('Done parsing %d schema(s): %d result(s).', schemasCount, results.length);
    return Promise.resolve(results);
  }

  /**
   * Returns the current/last run context. It can be used by the paginators to do their job.
   * @return {Object}
   */
  getRunContext() {
    return {};
  }
}

module.exports = JsonParser;
