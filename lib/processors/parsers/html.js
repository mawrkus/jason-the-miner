const cheerio = require('cheerio');
const debug = require('debug')('jason:parse:html');

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
   * @param {Object} [schema]
   * @return {Promise.<Object>}
   */
  run(html, schema) {
    if (!html) {
      debug('No HTML received!');
      return Promise.resolve({});
    }

    this._$ = cheerio.load(html);
    const $root = this._$.root();

    schema = schema || this._schema;
    this._follow = [];

    debug('Parsing schema...', schema);

    const result = this._parseSchema({ schema, $context: $root });

    debug('Done parsing schema.');

    return Promise.resolve({ result, follow: this._follow, schema });
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
   * @param {string} [schemaPath=[]]
   * @param {string} [parsedPath=[]]
   * @param {string} [tab='  ']
   * @return {Object}
   */
  _parseSchema({ schema, $context = {}, schemaPath = [], parsedPath = [], tab = '  ' }) {
    const result = {};

    Object.keys(schema)
      .filter(key => key[0] !== '_')
      .forEach((prop) => {
        const definition = schema[prop];

        switch (typeOf(definition)) {
          // selector?
          case 'string': // eslint-disable-line no-case-declarations
            debug('%sExtracting "%s" value(s) from "%s"...', tab, prop, definition);
            const value = this._extractElementValue(definition, $context, `${tab}  `);
            debug('%s* Value="%s"', `${tab}  `, value);
            result[prop] = value;
            break;

          // sub schema?
          case 'object':
            debug('%sParsing object "%s"...', tab, prop);
            result[prop] = this._parseSubSchema({
              schema: definition,
              $context,
              schemaPath: schemaPath.concat(prop),
              parsedPath: parsedPath.concat(prop),
              tab: `${tab}  `,
            });
            break;

          // list?
          case 'array': // eslint-disable-line no-case-declarations
            debug('%sParsing list "%s"...', tab, prop);
            result[prop] = this._parseListSchema({
              schema: definition[0],
              $context,
              schemaPath: schemaPath.concat([prop, 0]),
              parsedPath: parsedPath.concat(prop),
              tab: `${tab}  `,
            });
            break;

          default:
            debug('Unknow definition type!', definition);
            break;
        }
      });

    if (schema._follow) {
      debug('%sParsing "follow" definition...', tab);

      this._parseFollowSchema({
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
   * @param {Object} schema
   * @param {Cheerio} $context
   * @param {Array} schemaPath
   * @param {Array} parsedPath
   * @param {string} tab
   * @return {Object}
   */
  _parseSubSchema({ schema, $context, schemaPath, parsedPath, tab }) {
    const { _$: selectorAndMatcher } = schema;
    const parseArgs = {
      schema,
      $context,
      schemaPath,
      parsedPath,
      tab,
    };

    if (!selectorAndMatcher) {
      debug('%sWarning: no selector! Inheriting parent element.', tab);
      return this._parseSchema(parseArgs);
    }

    const { selector, matcher } = this._parseSelectorDef(selectorAndMatcher, tab);
    const $element = $context.find(selector);
    // TODO: match
    const elementsCount = $element.length;

    if (!elementsCount) {
      debug('%sWarning: no DOM element found for selector "%s"! Inheriting parent element.', tab, selector);
      return this._parseSchema(parseArgs);
    }

    if (elementsCount > 1) {
      debug('%sWarning: found %d DOM element(s) for selector "%s"!', tab, elementsCount, selector);
    } else {
      debug('%sFound DOM element for selector "%s".', tab, selector);
    }

    return this._parseSchema({
      ...parseArgs,
      $context: $element,
    });
  }

  /**
   * @param {Object|string} schema
   * @param {Cheerio} $context
   * @param {Array} schemaPath
   * @param {Array} parsedPath
   * @param {string} tab
   * @return {Array}
   */
  _parseListSchema({ schema, $context, schemaPath, parsedPath, tab }) {
    if (typeOf(schema) === 'string') {
      const valuesList = this._extractElementValue(schema, $context, `${tab}  `);
      debug('%s* Values="%s"', `${tab}  `, valuesList);
      return [].concat(valuesList); // just in case
    }

    const { _$: selectorAndMatcher, _slice = '' } = schema;
    const { selector, matcher } = this._parseSelectorDef(selectorAndMatcher, tab);
    const { $elements, elementsCount } = this._findSlicedElements(selector, _slice, $context, tab);
    // TODO: match

    const list = [];

    $elements.each((index, domElement) => {
      debug('%s--> %d/%d', tab, index + 1, elementsCount);
      const $element = this._$(domElement);

      const result = this._parseSchema({
        schema,
        $context: $element,
        schemaPath,
        parsedPath: parsedPath.concat(index),
        tab
      });

      list.push(result);
    });

    return list;
  }

    /**
   * @param {Object} schema
   * @param {Cheerio} $context
   * @param {Array} schemaPath
   * @param {Array} parsedPath
   * @param {string} tab
   */
  _parseFollowSchema({ schema, $context, schemaPath, parsedPath, tab }) {
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
        helperDebug.push(`no ${category} (using default)`);
        return categoryHelpers.default.bind(categoryHelpers);
      }

      const { name, params } = this._parseHelperDef(helperDef);

      if (!categoryHelpers[name]) {
        throw new Error(`Unknown ${category} "${name}"!`);
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
   * @param {string} selectorDef
   * @param {Cheerio} $context
   * @param {string} [tab='']
   * @return {null|string|Array}
   */
  _extractElementValue(selectorDef, $context, tab) {
    const { selector, matcher, extractor, filter } = this._parseSelectorDef(selectorDef, tab);

    const $elements = selector ? $context.find(selector) : $context;
    // TODO: match
    debug('%sFound %d DOM element(s) for selector "%s".', tab, $elements.length, selector);

    if (!$elements.length) {
      return null;
    }

    if ($elements.length === 1) {
      return filter(extractor($elements.first()));
    }

    const values = [];

    $elements.each((index, domElement) => {
      const $element = this._$(domElement);
      values.push(filter(extractor($element)));
    });

    return values;
  }
}

module.exports = HtmlParser;
