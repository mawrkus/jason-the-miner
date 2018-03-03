const get = require('lodash.get');
const debug = require('debug')('jason:parse:json');

const REGEXP_SLICE_PARAMS = /\D*(\d+)\D*,\D*(\d+)/;

/**
 * Parses JSON. Depends on the "loadsh.get" package.
 * @see https://www.npmjs.com/package/lodash.get
 */
class JsonParser {
  /**
   * @param  {Object} config The processor configuration
   * @param  {Object[]} [config.schema={} The schema definition
   */
  constructor(config) {
    this._schema = config.schema || {};
    debug('JsonParser instance created.');
    debug('schema', this._schema);
  }

  /**
   * Runs the processor: parses the JSON passed as parameter using the schema(s) defined in the
   * configuration.
   * @param {Object} json
   * @return {Promise.<Object>}
   */
  run(json) {
    this._json = json;

    if (typeof this._json === 'string') {
      debug('String received, parsing JSON...');

      try {
        this._json = JSON.parse(this._json);
      } catch (parseError) {
        debug(parseError);
        return Promise.resolve(parseError);
      }
    }

    const schemasCount = this._schemas.length;
    const results = {};

    debug('%d schema(s) to parse.', schemasCount);

    this._schemas.forEach((schema, schemaIndex) => {
      const schemaName = Object.keys(schema)[0];
      const schemaDef = schema[schemaName];

      debug('Parsing schema %d/%d...', schemaIndex + 1, schemasCount);
      results[schemaName] = this._parseSchema(schemaName, schemaDef, this._json);
      debug('Done parsing schema %d/%d.', schemaIndex + 1, schemasCount);
    });

    return Promise.resolve(results);
  }

  /**
   * Recursive traversal of the the schema definition.
   * @param {string} schemaName
   * @param {string} schemaDefinition
   * @param {Object} context
   * @param {string} [tab='  ']
   * @return {null|string|Array}
   */
  _parseSchema(schemaName, schemaDefinition, context, tab = '  ') {
    // base case: path?
    if (typeof schemaDefinition === 'string') {
      debug('%sExtracting "%s" value(s) at path "%s":', tab, schemaName, schemaDefinition);
      const value = schemaDefinition ? get(context, schemaDefinition, null) : context;
      debug('%s* Value="%s"', `${tab}  `, value);
      return value;
    }

    // recursive case: object containing a path (_$),
    // optional params (like _slice) and new definitions
    debug('%sParsing "%s"', tab, schemaName);

    const path = schemaDefinition._$;
    let elements = get(context, path, []);
    if (!Array.isArray(elements)) {
      elements = [elements];
    }
    let elementsCount = elements.length;
    debug('%sFound %d element(s) at path "%s".', tab, elementsCount, path);

    const sliceMatch = (schemaDefinition._slice || '').match(REGEXP_SLICE_PARAMS);
    if (sliceMatch) {
      elements = elements.slice(sliceMatch[1], sliceMatch[2]);
      elementsCount = elements.length;
      debug('%sSlicing: [%d, %d[ -> %d element(s)', tab, sliceMatch[1], sliceMatch[2], elementsCount);
    }

    const newNames = Object.keys(schemaDefinition).filter(name => name[0] !== '_');
    const results = [];

    elements.forEach((element, index) => {
      debug('%s--> "%s" %d/%d', tab, schemaName, index + 1, elementsCount);
      const result = {};

      newNames.forEach((newName) => {
        result[newName] = this._parseSchema(newName, schemaDefinition[newName], element, `${tab}  `);
      });

      results.push(result);
    });

    return results;
  }
}

module.exports = JsonParser;
