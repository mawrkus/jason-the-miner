const cheerio = require('cheerio');
const debug = require('debug')('jason:parse:html');

const REGEXP_PART_DEFINITION = /([^<|]*)(<<)?([^|]*)(\|)?(.*)/;
const REGEXP_EXTRACTOR_AND_PARAM = /([^:]+):?(.*)/;
const REGEXP_SLICE_PARAMS = /\D*(\d+)\D*,\D*(\d+)/;

/**
 * Parses HTML. Depends on the "cheerio" package.
 * @see https://github.com/cheeriojs/cheerio
 */
class HtmlParser {
  /**
   * @param  {Object} config The processor configuration
   * @param  {Object[]} [config.schemas=[]] The parse schemas
   * @param  {Object} helpers A set of parse helpers
   * @param  {Object} helpers.extract A set of extractors
   * @param  {Object} helpers.filter A set of filters
   */
  constructor(config, helpers) {
    this._schemas = config.schemas || [];
    this._extractors = helpers.extract;
    this._filters = helpers.filter;
    this._$ = cheerio;
    debug('HtmlParser instance created.');
    debug('schemas', this._schemas);
    debug('helpers', helpers);
  }

  /**
   * Runs the processor: parses the HTML passed as parameter using the schema(s) defined in the
   * configuration.
   * @param {string} html
   * @return {Promise.<Object[]>}
   */
  run(html) {
    if (!html) {
      debug('No HTML received!');
      return Promise.resolve([]);
    }

    const schemasCount = this._schemas.length;
    const results = {};

    debug('Loading %d chars of HTML to parse %d schema(s)...', html.length, schemasCount);
    this._$ = cheerio.load(html);

    this._schemas.forEach((schema, schemaIndex) => {
      const schemaName = Object.keys(schema)[0];
      const schemaDef = schema[schemaName];
      debug('Parsing schema %d/%d...', schemaIndex + 1, schemasCount);
      results[schemaName] = this._parseSchema(schemaName, schemaDef, this._$(':root'));
      debug('Done parsing schema %d/%d.', schemaIndex + 1, schemasCount);
    });

    return Promise.resolve(results);
  }

  /**
   * Returns the current/last run context. It can be used by the paginators to do their job.
   * @return {Object}
   */
  getRunContext() {
    return { $: this._$ };
  }

  /**
   * Recursive traversal of the the schema definition.
   * @param {string} schemaName
   * @param {string} schemaDefinition
   * @param {Cheerio} $context
   * @param {string} [tab='  ']
   * @return {null|string|Array}
   */
  _parseSchema(schemaName, schemaDefinition, $context, tab = '  ') {
    // base case: selector?
    if (typeof schemaDefinition === 'string') {
      debug('%sExtracting "%s" value(s)...', tab, schemaName);
      const value = this._extractElementValue(schemaDefinition, $context, tab);
      debug('%sValue=', `${tab}  `, value);
      return value;
    }

    // recursive case: object containing a selector ($) and new definitions
    debug('%sParsing "%s"...', tab, schemaName);

    const selector = schemaDefinition._$;
    let $elements = $context.find(selector);
    let elementsCount = $elements.length;
    debug('%sFound %d DOM element(s) for selector "%s".', tab, elementsCount, selector);

    const sliceMatch = (schemaDefinition._slice || '').match(REGEXP_SLICE_PARAMS);
    if (sliceMatch) {
      $elements = $elements.slice(sliceMatch[1], sliceMatch[2]);
      elementsCount = $elements.length;
      debug('%sSlicing: [%d, %d[ -> %d element(s)', tab, sliceMatch[1], sliceMatch[2], elementsCount);
    }

    const newNames = Object.keys(schemaDefinition).filter(name => name[0] !== '_');
    const results = [];

    $elements.each((index, domElement) => {
      debug('%s--> "%s" %d/%d...', tab, schemaName, index + 1, elementsCount);
      const $element = this._$(domElement);
      const result = {};

      newNames.forEach(newName => {
        result[newName] = this._parseSchema(newName, schemaDefinition[newName], $element, `${tab}  `);
      });

      results.push(result);
    });

    return results;
  }

  /**
   * @param {string} selectorExtractorFilter
   * @param {Cheerio} $context
   * @param {string} [tab='']
   * @return {null|string|Array}
   */
  _extractElementValue(selectorExtractorFilter, $context, tab) {
    const parsed = this._parseSelector(selectorExtractorFilter, tab);
    const $elements = parsed.selector ? $context.find(parsed.selector) : $context;
    debug('%sFound %d DOM element(s) for selector "%s".', tab, $elements.length, parsed.selector);

    if (!$elements.length) {
      return null;
    }

    let value = this._extractValue($elements.first(), parsed, `${tab}  `);

    if ($elements.length > 1) {
      value = [value];

      $elements.slice(1).each((index, domElement) => {
        const $element = this._$(domElement);
        value.push(this._extractValue($element, parsed));
      });
    }

    return value;
  }

  /**
   * @example
   * _parseSelector('li.result a << attr:title | trim');
   * //> {
   *    selector: 'li.result a',
   *    extractor: 'attr:title',
   *    filter: 'trim'
   * }
   * @param  {string} selectorExtractorFilter
   * @param  {string} tab
   * @return {Object}
   */
  _parseSelector(selectorExtractorFilter, tab) { // eslint-disable-line
    const matches = REGEXP_PART_DEFINITION.exec(selectorExtractorFilter || ''); // works for null-case
    let [, selector = '', , extractorNameAndParam = '', , filterName = ''] = matches || []; // eslint-disable-line

    extractorNameAndParam = extractorNameAndParam.trim() || 'default';
    const [, extractorName, extractorParam] = extractorNameAndParam.match(REGEXP_EXTRACTOR_AND_PARAM); // eslint-disable-line

    filterName = filterName.trim() || 'default';

    debug('%sUsing extractor="%s%s" and filter="%s"', tab, extractorName, extractorParam && `:${extractorParam}`, filterName); // eslint-disable-line

    return {
      selector: selector.trim(),
      extractor: this._extractors[extractorName],
      extractorParam,
      filter: this._filters[filterName]
    };
  }

  /**
   * Extracts and filter the value of the $ element passed as parameter.
   * @param {Cheerio} $element
   * @param {Function} extractor
   * @param {Object} params
   * @param {Function} params.extractor
   * @param {string} params.extractorParam
   * @param {Function} params.filter
   * @param {string} tab
   * @return {null|string}
   */
  _extractValue($element, { extractor, extractorParam, filter }, tab) { // eslint-disable-line
    if (!extractor) {
      debug('%sUnknown extractor "%s"!', tab);
      return null;
    }

    if (!filter) {
      debug('%sUnknown filter "%s"!', tab);
      return null;
    }

    const extractorParams = [$element];
    if (extractorParam) {
      extractorParams.push(extractorParam);
    }

    return filter(extractor(...extractorParams));
  }
}

module.exports = HtmlParser;
