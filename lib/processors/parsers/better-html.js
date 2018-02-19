const cheerio = require('cheerio');
const debug = require('debug')('jason:parse:html');

const REGEXP_SELECTOR_EXTRACTOR_FILTER = /([^<|]*)<?([^|]*)\|?(.*)/;
const REGEXP_EXTRACTOR_AND_PARAM = /([^:]+):?(.*)/;
const REGEXP_SLICE_PARAMS = /\D*(\d+)\D*,\D*(\d+)/;

/**
 * @param {string|Array|Object} definition
 * @return {string}
 */
function typeOfDefinition(definition) {
  if (typeof definition === 'string') {
    return 'string';
  }

  if (Array.isArray(definition)) {
    return 'array';
  }

  if (definition !== null && typeof definition === 'object') {
    return 'object';
  }
}

/**
 * Parses HTML. Depends on the "cheerio" package.
 * @see https://github.com/cheeriojs/cheerio
 */
class HtmlParser {
  /**
   * @param  {Object} schema The schema definition
   * @param  {Object} helpers A set of parse helpers
   * @param  {Object} helpers.extract A set of extractors
   * @param  {Object} helpers.filter A set of filters
   */
  constructor(schema, helpers) {
    this._schema = schema || {};
    this._extractors = helpers.extract;
    this._filters = helpers.filter;
    this._$ = cheerio;
    debug('HtmlParser instance created.');
    debug('schema', this._schema);
    debug('helpers', helpers);
  }

  /**
   * Runs the processor: parses the HTML passed as parameter using the schema(s) defined in the
   * configuration.
   * @param {string} html
   * @return {Promise.<Object>}
   */
  run(html) {
    if (!html) {
      debug('No HTML received!');
      return Promise.resolve({});
    }

    this._$ = cheerio.load(html);
    const $root = this._$.root();

    debug('Parsing schema...');

    const result = this._parseSchema(this._schema, $root);

    debug('Done parsing schema.');

    return Promise.resolve(result);
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
   * @param {Object} schema
   * @param {Cheerio} $context
   * @param {string} [tab='  ']
   * @return {Object}
   */
  _parseSchema(schema, $context = {}, tab = '  ') {
    const result = {};

    Object.keys(schema)
      .filter(key => key[0] !== '_')
      .forEach((prop) => {
        const definition = schema[prop];

        switch(typeOfDefinition(definition)) {
          // selector?
          case 'string':
            debug('%sExtracting "%s" value(s)...', tab, prop);
            const value = this._extractElementValue(definition, $context, tab);
            debug('%s* Value="%s"', `${tab}  `, value);
            result[prop] = value;
            break;

          // sub schema?
          case 'object':
            debug('%sParsing object "%s"...', tab, prop);
            result[prop] = this._parseSubSchema(definition, $context, `${tab}  `);
            break;

          // list?
          case 'array':
            debug('%sParsing list "%s"...', tab, prop);
            result[prop] = this._parseListDefinition(definition[0], $context, `${tab}  `);
            break;
        }

        //follow?
        if (schema._follow) {
          debug('%sParsing "follow" definition...', tab);
          result._follow = this._parseFollowDefinition(schema._follow, $context, `${tab}  `);
        }
      });

    return result;
  }

  /**
   * @param {Object} schema
   * @param {Cheerio} $context
   * @param {string} tab
   * @return {Object}
   */
  _parseSubSchema(schema, $context, tab) {
    const { _$: selector } = schema;

    if (!selector) {
      debug('%sWarning: no selector! Inheriting parent element.', tab);
      return this._parseSchema(schema, $context, tab);
    }

    const $element = $context.find(selector);
    const elementsCount = $element.length;

    if (!elementsCount) {
      debug('%sWarning: no DOM element found for selector "%s"! Inheriting parent element.', tab, selector);
      return this._parseSchema(schema, $context, tab);
    }

    if (elementsCount > 1) {
      debug('%sWarning: found %d DOM element(s) for selector "%s"!', tab, elementsCount, selector);
    }

    return this._parseSchema(schema, $element, tab);
  }

  /**
   * @param {Object} schema
   * @param {Cheerio} $context
   * @param {string} tab
   * @return {Array}
   */
  _parseListDefinition(schema, $context, tab) {
    const list = [];
    const { $elements, elementsCount } = this._findSlicedElements(schema, $context, tab);

    $elements.each((index, domElement) => {
      debug('%s--> %d/%d', tab, index + 1, elementsCount);
      const $element = this._$(domElement);
      const result = this._parseSchema(schema, $element, tab);
      list.push(result);
    });

    return list;
  }

    /**
   * @param {Object} definition
   * @param {Cheerio} $context
   * @param {string} tab
   * @return {Array}
   */
  _parseFollowDefinition(definition, $context, tab) {
    const selector = typeOfDefinition(definition) === 'string' ? definition : definition._$;

    if (!selector) {
      debug('%sWarning: no selector! Skipping.', tab);
      return {};
    }

    const { $elements, elementsCount } = this._findSlicedElements(definition, $context, tab);

    if (!elementsCount) {
      debug('%sWarning: no DOM element found for selector "%s"! Nothing to follow.', tab, selector);
      return {};
    }

    const links = [];

    $elements.each((index, domElement) => {
      debug('%s--> %d/%d', tab, index + 1, elementsCount);
      links.push(this._$(domElement).attr('href'));
    });

    return links;
  }

    /**
   * @param {Object} schema
   * @param {Cheerio} $context
   * @param {string} tab
   * @return {Object}
   */
  _findSlicedElements(schema, $context, tab) {
    const { _$: selector, _slice: slice = '' } = schema;

    let $elements = $context.find(selector);
    let elementsCount = $elements.length;
    debug('%sFound %d DOM element(s) for selector "%s".', tab, elementsCount, selector);

    const sliceMatch = slice.match(REGEXP_SLICE_PARAMS);
    if (sliceMatch) {
      $elements = $elements.slice(sliceMatch[1], sliceMatch[2]);
      elementsCount = $elements.length;
      debug('%sSlicing: [%d, %d[ -> %d element(s)', tab, sliceMatch[1], sliceMatch[2], elementsCount);
    }

    return { $elements, elementsCount };
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
   * _parseSelector('li.result a < attr:title | trim');
   * //> {
   *    selector: 'li.result a',
   *    extractor: attr() => ...',
   *    extractor: 'title',
   *    filter: trim() => ...
   * }
   * @param  {string} selectorExtractorFilter
   * @param  {string} tab
   * @return {Object}
   */
  _parseSelector(selectorExtractorFilter, tab) { // eslint-disable-line
    const matches = REGEXP_SELECTOR_EXTRACTOR_FILTER.exec(selectorExtractorFilter || ''); // works for null-case
    let [, selector = '', extractorNameAndParam = '', filterName = ''] = matches || []; // eslint-disable-line

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
   * Extracts and filters the value of the $element passed as parameter.
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
      debug('%sUnknown extractor!', tab);
      return null;
    }

    if (!filter) {
      debug('%sUnknown filter!', tab);
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
