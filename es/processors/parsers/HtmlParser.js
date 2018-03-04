const cheerio = require('cheerio');
const debug = require('debug')('jason:parse:html');

// eslint-disable-next-line max-len
const REGEX_SELECTOR_DEFINITION = /([^?<|]+)?(\?[^<|]+|\?[^(]+\(.+\))?(<[^|]+|<[^(]+\(.+\))?(\|.+)?/;
const REGEX_HELPER = /([^(]+)\(?([^)]*)\)?/;
const REGEXP_SLICE_PARAMS = /\D*(\d+)\D*,\D*(\d+)/;

/**
 * @param {string|Array|Object} definition
 * @return {string}
 */
function typeOf(definition) {
  if (typeof definition === 'string') {
    return 'string';
  }

  if (Array.isArray(definition)) {
    return 'array';
  }

  if (definition !== null && typeof definition === 'object') {
    return 'object';
  }

  return '?';
}

/**
 * Parses HTML. Depends on the "cheerio" package.
 * @see https://github.com/cheeriojs/cheerio
 */
class HtmlParser {
  /**
   * @param  {Object} schema The schema definition
   * @param  {Object} helpers A set of parse helpers
   * @param  {Object} helpers.match A set of matchers
   * @param  {Object} helpers.extract A set of extractors
   * @param  {Object} helpers.filter A set of filters
   */
  constructor(schema, helpers) {
    this._schema = schema || {};
    this._helpers = helpers;
    this._$ = cheerio;
    this._follow = [];

    debug('HtmlParser instance created.');
    debug('schema', this._schema);
    debug('helpers', this._helpers);
  }

  /**
   * Runs the processor: parses the HTML passed as parameter using the given schema.
   * @param {string} html
   * @param {Object} [customSchema]
   * @return {Promise.<Object>}
   */
  async run(html, customSchema) {
    if (!html) {
      debug('No HTML received!');
      return Promise.resolve({});
    }

    this._$ = cheerio.load(html);
    const $root = this._$.root();

    const schema = customSchema || this._schema;
    this._follow = [];

    debug('Parsing schema...', schema);

    const result = this._parseSchema({ schema, $context: $root });

    debug('Done parsing schema.');

    return { result, follow: this._follow, schema };
  }

  /**
   * Recursive traversal of the the schema definition.
   * @param {Object} schema
   * @param {Cheerio} $context
   * @param {string} [schemaPath=[]]
   * @param {string} [parsedPath=[]]
   * @param {string} [tab='']
   * @return {Object}
   */
  _parseSchema({
    schema,
    $context = {},
    schemaPath = [],
    parsedPath = [],
    tab = '',
  }) {
    const result = {};

    switch (typeOf(schema)) {
      case 'string': // eslint-disable-line no-case-declarations
        debug('%sParsing value(s) from "%s"...', tab, schema);
        const value = this._extractElementValue({
          schema,
          $context,
          tab: `${tab}  `,
        });
        debug('%s* Value="%s"', `${tab}  `, value);
        return value;

      case 'object':
        debug('%sParsing object schema...', tab);
        return this._parseObjectSchema({
          schema,
          $context,
          schemaPath,
          parsedPath,
          tab: `${tab}  `,
        });

      case 'array': // eslint-disable-line no-case-declarations
        debug('%sParsing array schema...', tab);
        return this._parseArraySchema({
          schema,
          $context,
          schemaPath,
          parsedPath,
          tab: `${tab}  `,
        });

      default:
        debug('Unsupported schema type!', schema);
        break;
    }

    return result;
  }

  /**
   * @param {Object} schema
   * @param {Cheerio} $context
   * @param {Array} schemaPath
   * @param {Array} parsedPath
   * @param {string} tab
   * @return {Object}
   */
  _parseObjectSchema({
    schema,
    $context,
    schemaPath,
    parsedPath,
    tab,
  }) {
    const result = {};
    const { _$: selectorAndMatcher, _slice = '' } = schema;
    let $newContext = $context;

    if (!selectorAndMatcher) {
      debug('%sWarning: no root element selector! Inheriting parent element.', tab);
    } else {
      const { selector, matcher } = this._parseSelectorDef(selectorAndMatcher, tab);

      const {
        $elements,
        elementsCount,
      } = this._findSlicedElements(selector, _slice, $context, tab);
      // TODO: match

      $newContext = $elements;

      if (elementsCount > 1) {
        debug('%sWarning: keeping only the first element!', tab);
        $newContext = $newContext.first();
      }
    }

    Object.keys(schema)
      .filter(key => key[0] !== '_')
      .forEach((prop) => {
        debug('%sParsing "%s"...', tab, prop);

        const definition = schema[prop];

        const value = this._parseSchema({
          schema: definition,
          $context: $newContext,
          schemaPath: schemaPath.concat(prop),
          parsedPath: parsedPath.concat(prop),
          tab,
        });

        result[prop] = value;
      });

    if (schema._follow) {
      debug('%sParsing "follow" definition...', tab);

      this._parseFollowDef({
        schema: schema._follow,
        $context,
        schemaPath: schemaPath.concat('_follow'),
        parsedPath,
        tab: `${tab}  `,
      });
    }

    return result;
  }

  /**
   * @param {Object|string} schema
   * @param {Cheerio} $context
   * @param {Array} schemaPath
   * @param {Array} parsedPath
   * @param {string} tab
   * @return {Array}
   */
  _parseArraySchema({
    schema,
    $context,
    schemaPath,
    parsedPath,
    tab,
  }) {
    const result = [];
    const definition = schema[0];
    let selectorAndMatcher = definition;
    let slice;
    let newSchema;

    schemaPath.push(0);

    if (typeOf(definition) === 'string') {
      selectorAndMatcher = definition;
      slice = '';
      newSchema = '';
    } else if (typeOf(definition) === 'object') {
      // TODO: allow if it has a single key, as a short notation?
      if (!definition._$) {
        throw new Error(`No root element selector defined in array schema (path="${schemaPath}")!`);
      }

      selectorAndMatcher = definition._$;
      slice = definition._slice;

      newSchema = { ...definition };

      delete newSchema._$;
      delete newSchema._slice;
    } else {
      throw new Error(`Array schemas can only contain a string or an object (path="${schemaPath}")!`);
    }

    const { selector, matcher } = this._parseSelectorDef(selectorAndMatcher, tab);
    const { $elements, elementsCount } = this._findSlicedElements(selector, slice, $context, tab);
    // TODO: match

    $elements.each((index, domElement) => {
      debug('%s--> %d/%d', tab, index + 1, elementsCount);
      const $element = this._$(domElement);

      const value = this._parseSchema({
        schema: newSchema,
        $context: $element,
        schemaPath,
        parsedPath: parsedPath.concat(index),
        tab,
      });

      result.push(value);
    });

    return result;
  }

  /**
   * @param {Object} schema
   * @param {Cheerio} $context
   * @param {Array} schemaPath
   * @param {Array} parsedPath
   * @param {string} tab
   */
  _parseFollowDef({
    schema,
    $context,
    schemaPath,
    parsedPath,
    tab,
  }) {
    const { _link: selectorAndMatcher } = schema;

    if (!selectorAndMatcher) {
      debug('%sWarning: no link selector! Skipping.', tab);
      return;
    }

    const { selector, matcher } = this._parseSelectorDef(selectorAndMatcher, tab);
    const { $elements, elementsCount } = this._findSlicedElements(selector, '', $context, tab);
    // TODO: match

    if (!elementsCount) {
      debug('%sWarning: no DOM element found for selector "%s"! Nothing to follow.', tab, selector);
      return;
    }

    const linksAndPaths = [];

    $elements.each((index, domElement) => {
      const rawLink = this._$(domElement).attr('href') || '';
      const link = rawLink.trim();

      debug('%s-> %d/%d = "%s"', tab, index + 1, elementsCount, link);

      linksAndPaths.push({ link, schemaPath, parsedPath });
    });

    this._follow = this._follow.concat(linksAndPaths);
  }

  /**
   * @param {string} selector
   * @param {string} slice
   * @param {Cheerio} $context
   * @param {string} tab
   * @return {Object}
   */
  // eslint-disable-next-line class-methods-use-this
  _findSlicedElements(selector, slice = '', $context, tab) {
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
   * @param  {string} E.g: a.item ? attr(href,https?://) < attr(title) | trim
   * @return {Object} parsed
   * @return {string} parsed.selector E.g: a.item
   * @return {Function} parsed.matcher E.g: Function('href', 'https?://')
   * @return {Function} parsed.extractor E.g: Function('title')
   * @return {Function} parsed.filter E.g: Function()
   */
  _parseSelectorDef(selectorDef, tab) {
    // debug('%sParsing selector definition="%s".', tab, selectorDef);
    const [
      ,
      rawSelector = '',
      rawMatcher = '',
      rawExtractor = '',
      rawFilter = '',
    ] = selectorDef.match(REGEX_SELECTOR_DEFINITION);

    const selector = rawSelector.trim();
    const helpersDefs = [
      { category: 'match', helperDef: rawMatcher.slice(1).trim() },
      { category: 'extract', helperDef: rawExtractor.slice(1).trim() },
      { category: 'filter', helperDef: rawFilter.slice(1).trim() },
    ];

    const helperDebug = [];

    const [matcher, extractor, filter] = helpersDefs.map(({ category, helperDef }) => {
      const categoryHelpers = this._helpers[category];

      if (!helperDef) {
        helperDebug.push(`no ${category} helper (using default)`);
        return categoryHelpers.default.bind(categoryHelpers);
      }

      const { name, params } = this._parseHelperDef(helperDef);

      if (!categoryHelpers[name]) {
        throw new Error(`Unknown ${category} helper "${name}"!`);
      }

      helperDebug.push(`${category}="${name}(${params})"`);
      return categoryHelpers[name].bind(categoryHelpers, ...params);
    });

    debug('%sselector="%s"', tab, selector);
    debug('%s%s', tab, helperDebug.join(' / '));

    return { selector, matcher, extractor, filter };
  }

  /**
   * @param  {string} E.g: attr(href,https?://)
   * @return {Object} parsed
   * @return {string} parsed.name E.g: attr
   * @return {string[]} parsed.params E.g: ['href', 'https?://']
   */
  // eslint-disable-next-line class-methods-use-this
  _parseHelperDef(helperDefinition) {
    const [, rawName = '', rawParams = ''] = helperDefinition.match(REGEX_HELPER);
    const name = rawName.trim();
    const params = !rawParams ? [] : rawParams.split(',').map(p => p.trim());
    return { name, params };
  }

  /**
   * @param {string} schema
   * @param {Cheerio} $context
   * @param {string} [tab='']
   * @return {null|string}
   */
  _extractElementValue({ schema, $context, tab }) {
    const {
      selector,
      matcher,
      extractor,
      filter,
    } = this._parseSelectorDef(schema, tab);

    // allow empty selector to get the value from the root/current element
    const { $elements, elementsCount } = selector ?
      this._findSlicedElements(selector, '', $context, tab) :
      { $elements: $context, elementsCount: $context.length };
    // TODO: match

    if (!elementsCount) {
      debug('%sWarning: no element found!', tab);
      return null;
    }

    if (elementsCount > 1) {
      debug('%sWarning: keeping only the first element!', tab);
    }

    return filter(extractor($elements.first()));
  }
}

module.exports = HtmlParser;
