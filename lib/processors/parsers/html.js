const cheerio = require('cheerio');
const debug = require('debug')('jason:parse:html');

const REGEXP_PART_DEFINITION = /([^<|]*)(<<)?([^|]*)(\|)?(.*)/;
const REGEXP_EXTRACTOR_AND_PARAM = /([^:]+):?(.*)/;
const REGEXP_SLICE_PARAMS = /\D*(\d+)\D*,\D*(\d+)/;

/**
 * @example
 * _parsePartDefinition('li.result a << attr:title | trim');
 * //> {
 *    selector: 'li.result a',
 *    extractor: 'attr:title',
 *    filter: 'trim'
 * }
 * @param  {string} selectorExtractorFilter
 * @return {Object}
 */
function _parsePartDefinition(selectorExtractorFilter) {
  const matches = REGEXP_PART_DEFINITION.exec(selectorExtractorFilter || ''); // works for null-case
  const [, selector = '', , extractor = '', , filter = ''] = matches || [];
  return {
    selector: selector.trim(),
    extractor: extractor.trim() || 'default',
    filter: filter.trim() || 'default'
  };
}

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
    const results = [];

    debug('Loading %d chars of HTML to parse %d schema(s)...', html.length, schemasCount);
    const $ = this._$ = cheerio.load(html);

    this._schemas.forEach((schema, schemaIndex) => {
      debug('Parsing schema %d/%d...', schemaIndex + 1, schemasCount);
      const selector = Object.keys(schema)[0];
      const parts = schema[selector];
      const partsNames = Object.keys(parts);
      let $elements = $(selector);
      debug(' Found %d DOM element(s) for selector "%s".', $elements.length, selector);

      const sliceMatch = (schema.slice || '').match(REGEXP_SLICE_PARAMS);
      if (sliceMatch) {
        $elements = $elements.slice(sliceMatch[1], sliceMatch[2]);
        debug(' Slicing: [%d, %d[ -> %d element(s)', sliceMatch[1], sliceMatch[2], $elements.length);
      }

      $elements.each((elementIndex, domElement) => {
        const newItem = {};

        debug('  #%d -> extracting parts...', elementIndex);
        partsNames.forEach(partName => {
          const partDefinition = parts[partName];
          const { selector, extractor, filter } = _parsePartDefinition(partDefinition);
          const $partElements = selector ? $(domElement).find(selector) : $(domElement);

          debug('   Found %d DOM element(s) for part selector "%s".', $partElements.length, selector);
          if (!$partElements.length) {
            debug('   "%s" is null.', partName);
            newItem[partName] = null;
            return;
          }

          debug('    Extracting "%s" value(s)...', partName);
          newItem[partName] = this._extractPartValue($partElements.first(), extractor, filter);

          if ($partElements.length > 1) {
            newItem[partName] = [newItem[partName]];

            $partElements.slice(1).each((partElementIndex, domElement) => {
              newItem[partName].push(this._extractPartValue($(domElement), extractor, filter));
            });
          }
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
    return { $: this._$ };
  }

  /**
   * Extracts and filter the value of the $ element passed as parameter.
   * @param {Cheerio} $part
   * @param {string} fullExtractorName
   * @param {string} filterName
   * @return {null|string}
   */
  _extractPartValue($part, fullExtractorName, filterName) {
    const [, extractorName, extractorParam] = fullExtractorName.match(REGEXP_EXTRACTOR_AND_PARAM);
    const extractor = this._extractors[extractorName];
    const extractorParams = [$part];
    if (!extractor) {
      debug('    Unknown extractor "%s"!', extractorName);
      return null;
    }

    const filter = this._filters[filterName];
    if (!filter) {
      debug('    Unknown filter "%s"!', filterName);
      return null;
    }

    if (extractorParam) {
      extractorParams.push(extractorParam);
      debug('     Using extractor="%s:%s" and filter="%s"', extractorName, extractorParam, filterName);
    } else {
      debug('     Using extractor="%s" and filter="%s"', extractorName, filterName);
    }

    const value = filter(extractor(...extractorParams));
    debug('     Value="%s"', value);

    return value;
  }
}

module.exports = HtmlParser;
