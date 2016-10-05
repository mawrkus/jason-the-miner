const cheerio = require('cheerio');
const debug = require('debug')('jason:parse');

const REGEXP_PART_DEFINITION = /([^<|]+)(<<)?([^|]*)(\|)?(.*)/;

function _parsePartDefinition(selectorExtractorFilter) {
  const matches = REGEXP_PART_DEFINITION.exec(selectorExtractorFilter);
  const [, selector, , extractor, , filter] = matches;
  return {
    selector: selector.trim(),
    extractor: extractor.trim() || 'default',
    filter: filter.trim() || 'default'
  };
}

class HtmlParser {

  constructor(config, helpers) {
    this._schemas = config.schemas;
    this._extractors = helpers.extractors;
    this._filters = helpers.filters;
    this._$ = cheerio;
    debug('HtmlParser instance created.');
    debug('schemas', this._schemas);
    debug('helpers', helpers);
  }

  getConfig() {
    return { context: this._$ };
  }

  run(html) {
    const results = [];

    if (!html) {
      debug('No HTML received!');
      return Promise.resolve(results);
    }

    debug('Parsing %d chars...', html.length);
    const $ = this._$ = cheerio.load(html);

    this._schemas.forEach(schema => {
      const selector = Object.keys(schema)[0];
      const parts = schema[selector];
      const $elements = $(selector);

      debug('Found %d DOM element(s) for element "%s".', $elements.length, selector);
      $elements.each((index, domElement) => {
        const newResult = {};

        debug(' #%d -> extracting parts...', index);
        parts.forEach(part => {
          const name = Object.keys(part)[0];

          const { selector, extractor, filter } = _parsePartDefinition(part[name]);
          const $parts = $(domElement).find(selector);

          debug('  Found %d DOM element(s) for part "%s".', $parts.length, selector);
          if (!$parts.length) {
            debug('  "%s" is null.', name);
            newResult[name] = null;
            return;
          }

          debug('   Extracting "%s" value(s)...', name);
          newResult[name] = this._extractPartValue($parts.first(), extractor, filter);

          if ($parts.length > 1) {
            newResult[name] = [newResult[name]];
            $parts.slice(1).each((index, domElement) => {
              newResult[name].push(this._extractPartValue($(domElement), extractor, filter));
            });
          }
        });

        results.push(newResult);
      });
    });

    debug('Done parsing: %d result(s).', results.length);
    return Promise.resolve(results);
  }

  _extractPartValue($part, fullExtractorName, filterName) {
    const [extractorName, extractorParam] = fullExtractorName.split(':');
    const extractor = this._extractors[extractorName];
    const extractorParams = [$part];
    if (!extractor) {
      debug('   Unknown extractor "%s"!', extractorName);
      return null;
    }

    const filter = this._filters[filterName];
    if (!filter) {
      debug('   Unknown filter "%s"!', filterName);
      return null;
    }

    if (extractorParam) {
      extractorParams.push(extractorParam);
      debug('    Using extractor="%s:%s" and filter="%s"', extractorName, extractorParam, filterName);
    } else {
      debug('    Using extractor="%s" and filter="%s"', extractorName, filterName);
    }

    const value = filter(extractor(...extractorParams));
    debug('    Value="%s"', value);

    return value;
  }

}

module.exports = HtmlParser;
