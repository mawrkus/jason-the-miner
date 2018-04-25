const cheerio = require('cheerio');
const debug = require('debug')('jason:parse:html');

// eslint-disable-next-line max-len
const REGEX_SELECTOR_DEFINITION = /([^?<|]+)?(\?[^<|]+|\?[^(]+\(.+\))?(<[^|]+|<[^(]+\(.+\))?(\|.+)?/;
const REGEX_HELPER_WITHOUT_PARENS = /([^()]+)/;
const REGEX_HELPER_WITH_PARENS = /([^()]+)\((.*)\)/;

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
    this._follows = [];
    this._paginates = [];

    debug('HtmlParser instance created.');
    debug('schema', this._schema);
    debug('helpers', this._helpers);
  }

  /**
   * Runs the processor: parses the HTML passed as parameter using the given schema.
   * @param {string} data
   * @param {Object} [customSchema]
   * @return {Promise.<Object>}
   */
  async run({ data: html, schema }) {
    this._$ = cheerio.load(html);
    const $root = this._$.root();

    schema = schema || this._schema; // eslint-disable-line no-param-reassign
    this._follows = [];
    this._paginates = [];

    debug('Parsing schema...', schema);
    const start = Date.now();

    const result = this._parseSchema({ schema, $context: $root });

    const elapsed = Date.now() - start;
    debug('Done parsing schema in %dms.', elapsed);

    return {
      result,
      schema,
      follows: this._follows,
      paginates: this._paginates,
    };
  }

  /**
   * Recursive traversal of the the schema definition.
   * @param {Object} schema
   * @param {Cheerio} $context
   * @param {string} [schemaPath=[]]
   * @param {string} [parsedPath=[]]
   * @param {string} [tab='']
   * @return {Object|Null}
   */
  _parseSchema({
    schema,
    $context = {},
    schemaPath = [],
    parsedPath = [],
    tab = '',
  }) {
    switch (typeOf(schema)) {
      case 'string': // eslint-disable-line no-case-declarations
        debug('%sParsing value from "%s"...', tab, schema);
        const value = this._extractElementValue({
          selectorDef: schema,
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

      case 'array':
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
        return null;
    }
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
    const { _$: selectorDef, _slice: slice = '' } = schema;
    let $newContext = $context;

    if (!selectorDef) {
      // debug('%sNo root element selector, inheriting parent element.', tab);
    } else {
      const { selector, matcher } = this._parseSelectorDef({ selectorDef, tab });

      const { $elements, elementsCount } = this._findSlicedElements({
        selector,
        matcher,
        slice,
        $context,
        tab,
      });

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
      debug('%sParsing "follow" schema...', tab);

      this._parseFollowSchema({
        schema: schema._follow,
        $context,
        schemaPath: schemaPath.concat('_follow'),
        parsedPath,
        tab: `${tab}  `,
      });
    }

    if (schema._paginate) {
      debug('%sParsing "paginate" schema...', tab);

      this._parsePaginateSchema({
        schema: schema._paginate,
        $context,
        schemaPath,
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
    const definition = schema[0];
    const definitionType = typeOf(definition);

    schemaPath.push(0);

    if (definitionType !== 'string' && definitionType !== 'object') {
      throw new Error(`Array schemas can only contain a string or an object (path="${schemaPath}")!`);
    }

    const result = [];
    let selectorDef = definition;
    let slice = '';
    let newSchema;

    if (definitionType === 'object') {
      // TODO: allow if it has a single key, as a short notation?
      if (!definition._$) {
        throw new Error(`No root element selector defined in array schema (path="${schemaPath}")!`);
      }
      selectorDef = definition._$;
      slice = definition._slice;
    }

    const { selector, matcher } = this._parseSelectorDef({ selectorDef, tab });

    if (definitionType === 'string') {
      // Ideally the matcher part of the selector definition should be removed as well
      // but it works because _extractElementValue() makes a special case for empty selectors
      newSchema = selectorDef.replace(selector, '');
    } else {
      newSchema = { ...definition };
      delete newSchema._$;
      delete newSchema._slice;
    }

    const { $elements, elementsCount } = this._findSlicedElements({
      selector,
      matcher,
      slice,
      $context,
      tab,
    });

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
  _parseFollowSchema({
    schema,
    $context,
    schemaPath,
    parsedPath,
    tab,
  }) {
    const { _link: selectorDef } = schema;
    const { selector, matcher } = this._parseSelectorDef({ selectorDef, tab });

    // allow empty selector to get the value from the root/current element
    const { $elements, elementsCount } = selector ?
      this._findSlicedElements({
        selector,
        matcher,
        slice: '',
        $context,
        tab,
      }) :
      {
        $elements: $context,
        elementsCount: $context.length,
      };

    if (!elementsCount) {
      debug('%sWarning: no link found for selector "%s"! Nothing to follow.', tab, selector);
      return;
    }

    if (elementsCount > 1) {
      debug('%sWarning: keeping only the first link!', tab);
    }
    const $first = $elements.first();

    // TODO: allow custom extractor and filter?
    const link = ($first.attr('href') || $first.attr('src') || '').trim();
    if (!link) {
      debug('%sWarning: empty link found for selector "%s"! Nothing to follow.', tab, selector);
      return;
    }

    this._follows = this._follows.concat({ link, schemaPath, parsedPath });
  }

  /**
   * @param {Object} schema
   * @param {Cheerio} $context
   * @param {Array} schemaPath
   * @param {Array} parsedPath
   * @param {string} tab
   */
  _parsePaginateSchema({
    schema,
    $context,
    schemaPath,
    parsedPath,
    tab,
  }) {
    const { link: selectorDef, slice = '', depth = 1 } = schema;

    if (!selectorDef) {
      debug('%sWarning: no link selector! Skipping pagination.', tab);
      return;
    }

    const { selector, matcher } = this._parseSelectorDef({ selectorDef, tab });

    const { $elements, elementsCount } = this._findSlicedElements({
      selector,
      matcher,
      slice,
      $context,
      tab,
    });

    if (!elementsCount) {
      debug('%sWarning: no link found for selector "%s"! No pagination.', tab, selector);
      return;
    }

    if (Number.isInteger(parsedPath[parsedPath.length - 1])) {
      // we will concat the result of the pagination, so we don't need the last index
      parsedPath.pop();
    }

    $elements.each((index, domElement) => {
      // TODO: allow custom extractor and filter?
      const link = (this._$(domElement).attr('href') || '').trim();
      if (!link) {
        debug('%sWarning: empty link found for one of the elements of selector "%s"! Skipping pagination for this element.', tab, selector);
        return;
      }

      this._paginates = this._paginates.concat({
        link,
        depth: Number(depth), // just in case
        schemaPath,
        parsedPath,
      });
    });
  }

  /**
   * @param {string} selector
   * @param {Function} matcher
   * @param {string} slice
   * @param {Cheerio} $context
   * @param {string} tab
   * @return {Object}
   */
  // eslint-disable-next-line class-methods-use-this
  _findSlicedElements({
    selector,
    matcher,
    slice = '',
    $context,
    tab,
  }) {
    let $elements = $context.find(selector);
    let elementsCount = $elements.length;
    debug('%sFound %d DOM element(s) for selector "%s".', tab, elementsCount, selector);

    $elements = $elements.filter((index, domElement) => matcher(this._$(domElement), index));
    elementsCount = $elements.length;

    debug('%sAfter matching: %d element(s)', tab, elementsCount);

    if (slice) {
      const [begin, end] = slice.split(',').map(s => Number(s));
      $elements = $elements.slice(begin, end);
      elementsCount = $elements.length;
      debug('%sSlicing: [%s, %s[ -> %d element(s)', tab, begin, end || elementsCount, elementsCount);
    }

    return { $elements, elementsCount };
  }

  /**
   * @param {string} selectorDef E.g: a.item ? attr(href,https?://) < attr(title) | trim
   * @param {string} tab
   * @return {Object} parsed
   * @return {string} parsed.selector E.g: a.item
   * @return {Function} parsed.matcher E.g: Function('href', 'https?://')
   * @return {Function} parsed.extractor E.g: Function('title')
   * @return {Function} parsed.filter E.g: Function()
   */
  _parseSelectorDef({ selectorDef, tab }) {
    debug('%sParsing selector definition="%s".', tab, selectorDef);
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
      // debug('%sParsing "%s" helper definition="%s".', tab, category, helperDef);
      const categoryHelpers = this._helpers[category];

      if (!helperDef) {
        helperDebug.push(`no ${category} helper (using default)`);
        return categoryHelpers.default.bind(categoryHelpers);
      }

      const { name, params, rawParams } = this._parseHelperDef({ helperDef });

      if (!categoryHelpers[name]) {
        throw new Error(`Unknown ${category} helper "${name}"!`);
      }

      // ugly fix to make static text like "hey,you,oh!" to work properly
      // until a better idea/syntax for parsing
      if (category === 'extract' && name === 'text' && params.length) {
        helperDebug.push(`${category}="${name}(${rawParams})"`);
        return categoryHelpers[name].bind(categoryHelpers, rawParams);
      }

      helperDebug.push(`${category}="${name}(${params})"`);
      return categoryHelpers[name].bind(categoryHelpers, ...params);
    });

    debug('%sselector="%s"', tab, selector);
    debug('%s%s', tab, helperDebug.join(' / '));

    return {
      selector,
      matcher,
      extractor,
      filter,
    };
  }

  /**
   * @param  {string} E.g: attr(href,https?://)
   * @return {Object} parsed
   * @return {string} parsed.name E.g: attr
   * @return {string[]} parsed.params E.g: ['href', 'https?://']
   * @return {string} parsed.rawParams E.g: 'href,https?://'
   */
  // eslint-disable-next-line class-methods-use-this
  _parseHelperDef({ helperDef }) {
    let matches;

    // TODO: improve this, unleash the power of regex
    if (helperDef.indexOf('(') > -1) {
      matches = helperDef.match(REGEX_HELPER_WITH_PARENS);
    } else {
      matches = helperDef.match(REGEX_HELPER_WITHOUT_PARENS);
    }

    const [, rawName = '', rawParams = ''] = matches;
    const name = rawName.trim();
    const params = !rawParams ? [] : rawParams.split(',').map(p => p.trim());

    return { name, params, rawParams };
  }

  /**
   * @param {string} selectorDef
   * @param {Cheerio} $context
   * @param {string} [tab='']
   * @return {null|string}
   */
  _extractElementValue({ selectorDef, $context, tab }) {
    const {
      selector,
      matcher,
      extractor,
      filter,
    } = this._parseSelectorDef({ selectorDef, tab });

    // allow empty selector to get the value from the root/current element
    const { $elements, elementsCount } = selector ?
      this._findSlicedElements({
        selector,
        matcher,
        slice: '',
        $context,
        tab,
      }) :
      {
        $elements: $context,
        elementsCount: $context.length,
      };

    if (!elementsCount) {
      debug('%sWarning: no element!', tab);
      return null;
    }

    if (elementsCount > 1) {
      debug('%sWarning: keeping only the first element!', tab);
    }

    return filter(extractor($elements.first()));
  }
}

module.exports = HtmlParser;
