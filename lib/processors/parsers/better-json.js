const cheerio = require('cheerio');
const debug = require('debug')('jason:parse:json');

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

  return '?';
}

/**
 * Parses HTML. Depends on the "cheerio" package.
 * @see https://github.com/cheeriojs/cheerio
 */
class JsonParser {
  /**
   * @param  {Object} schema The schema definition
   */
  constructor(schema) {
    this._schema = schema || {};
    this._$ = cheerio;
    this._follow = [];

    debug('JsonParser instance created.');
    debug('schema', this._schema);
  }

  /**
   * Runs the processor: parses the JSON passed as parameter using the given schema.
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

        switch (typeOfDefinition(definition)) {
          // selector?
          case 'string': // eslint-disable-line no-case-declarations
            debug('%sExtracting "%s" value(s)...', tab, prop);
            const value = this._extractElementValue(definition, $context, tab);
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
            result[prop] = this._parseListDefinition({
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

      this._parseFollowDefinition({
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
    const { _$: selector } = schema;
    const parseArgs = {
      schema,
      $context,
      schemaPath,
      parsedPath,
      tab,
    };

    if (!selector) {
      debug('%sWarning: no selector! Inheriting parent element.', tab);
      return this._parseSchema(parseArgs);
    }

    const $element = $context.find(selector);
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
  _parseListDefinition({ schema, $context, schemaPath, parsedPath, tab }) {
    if (typeOfDefinition(schema) === 'string') {
      const valuesList = this._extractElementValue(schema, $context, tab);
      debug('%s* Values="%s"', `${tab}  `, valuesList);
      return [].concat(valuesList); // just in case
    }

    const { _$, _slice = '' } = schema;
    const { $elements, elementsCount } = this._findSlicedElements(_$, _slice, $context, tab);
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
  _parseFollowDefinition({ schema, $context, schemaPath, parsedPath, tab }) {
    const { _link: selector } = schema;

    if (!selector) {
      debug('%sWarning: no selector! Skipping.', tab);
      return;
    }

    const { $elements, elementsCount } = this._findSlicedElements(selector, '', $context, tab);

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

module.exports = JsonParser;
