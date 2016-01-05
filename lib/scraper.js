/* eslint-disable no-console, no-param-reassign */

'use strict';

const requestP = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');

const defaultFilters = require('./filters');
const defaultExtractors = require('./extractors');
const defaultPaginators = require('./paginators');
const logger = require('./log/logger');
const fakeLogger = require('./log/fake-logger');

/**
 *
 */
class JasonTheMiner {

  constructor(options /* { baseUrl, uri, headers, search, pagination, title, elements, outputFile='results.json', verbose } */ ) {
    this._baseUrl = options.baseUrl;
    // request requires that uri must be a string when using baseUrl
    this._uri = options.uri || '';
    this._headers = options.headers;
    this._search = options.search;

    this._pagination = options.pagination;
    if (this._pagination && !this._pagination.config) {
      throw new Error('Please specify the pagination "config" field in the config file!');
    }

    this._title = options.title || 'Results';

    this._elements = options.elements;
    if (!this._elements) {
      throw new Error('Please specify an "elements" field in the config file!');
    }
    this._normalizeElementsConfig();

    this._outputFile = options.outputFile;

    this._logger = options.verbose ? logger : fakeLogger;

    this._filters = defaultFilters;
    this._filters._logger = this._logger;

    this._extractors = defaultExtractors;
    this._extractors._logger = this._logger;

    this._paginators = defaultPaginators;
    this._extractors._logger = this._logger;
  }

  _normalizeElementsConfig() {
    this._elements.parts = this._elements.parts.map(part => {
      const name = Object.keys(part)[0];
      let config = part[name];
      if (typeof config === 'string') {
        config = {
          selector: config
        };
      }
      return {
        name, config
      };
    });
  }

  registerFilter(filterData /* { name, filter } */ ) {
    this._filters[filterData.name] = filterData.filter;
  }

  registerExtractor(extractorData /* { name, extractor } */ ) {
    this._extractors[extractorData.name] = extractorData.extractor;
  }

  scrape() {
    this._logger.log('Scraping at %s...', this._baseUrl);
    const requestOptions = this._buildRequestOptions();
    return this._scrape(requestOptions);
  }

  searchAndScrape(searchTerm) {
    this._logger.log('Searching for "%s" at %s...', searchTerm, this._baseUrl);
    const requestOptions = this._buildRequestOptions({
      query: searchTerm
    });
    return this._scrape(requestOptions);
  }

  _scrape(requestOptions) {
    const scrape = this._determineScrapingMode();
    return scrape(requestOptions)
      .then(allResults => this._formatResults(allResults, requestOptions))
      .then(this._saveResult.bind(this))
      .then(finalResult => {
        this._logger.log('All done! :D');
        return finalResult;
      });
  }

  _determineScrapingMode() {
    let paginator;

    if (!this._pagination) {
      this._logger.warn('No pagination mode defined. Defaults to single page.');
      paginator = this._paginators.none.bind(this);
      return this._scrapePageByPage.bind(this, paginator, 1);
    }

    const paginationConfig = this._pagination.config;

    if (this._pagination.mode === 'follow') {
      paginationConfig.max = paginationConfig.max || Infinity;
      paginator = this._paginators.follow.bind(this, paginationConfig);
      this._logger.log('Configured to scrape pages one by one up to %d page(s).', paginationConfig.max);
      return this._scrapePageByPage.bind(this, paginator, paginationConfig.max);
    }

    if (this._pagination.mode === 'all') {
      paginator = this._paginators.all.bind(this, paginationConfig);
      this._logger.log('Configured to scrape all remaining pages in parallel.');
      return this._scrapeAllPages.bind(this, paginator);
    }

    if (this._pagination.mode === 'count') {
      paginationConfig.number = paginationConfig.number || 1;
      paginator = this._paginators.count.bind(this, paginationConfig);
      this._logger.log('Configured to scrape %s page(s) in parallel.', paginationConfig.number);
      return this._scrapeAllPages.bind(this, paginator);
    }

    paginator = this._paginators.none.bind(this, paginationConfig);
    this._logger.warn('Unknown pagination mode "%s"! Defaults to single page.', this._pagination.mode);
    return this._scrapePageByPage.bind(this, paginator, 1);
  }

  _buildRequestOptions(queryParams) {
    // TODO: ES6 default values
    queryParams = queryParams || {};

    const options = {
      baseUrl: this._baseUrl,
      uri: this._uri,
      headers: this._headers,
      qs: {},
      transform: body => cheerio.load(body)
    };

    if (this._search) {
      if (!this._search.queryParam) {
        this._logger.warn('No search queryParam! Have you forgotten to specify it in the config?');
      } else {
        options.qs[this._search.queryParam] = queryParams.query || '';
      }
    }

    if (this._pagination && this._pagination.mode !== 'follow') {
      if (!this._pagination.config.queryParam) {
        this._logger.warn('No pagination queryParam! Have you forgotten to specify it in the config?');
      } else {
        options.qs[this._pagination.config.queryParam] = queryParams.page || 1;
      }
    }

    return options;
  }

  _formatResults(allResults, requestOptions) {
    const flattened = allResults.reduce((prev, actual) => prev.concat(actual), []);

    // order is important for the output
    const result = {
      title: this._title,
      baseUrl: this._baseUrl,
      uri: this._uri
    };
    if (this._search) {
      result.searchTerm = requestOptions.qs[this._search.queryParam];
    }
    result.pages = allResults.length;
    result.total = flattened.length;
    result.elements = flattened;

    this._logger.log('%d element(s) found in %d page(s).', result.total, result.pages);

    return result;
  }

  _saveResult(finalResult) {
    if (this._outputFile) {
      this._logger.log('Saving result to file "%s"...', this._outputFile);
      fs.writeFileSync(this._outputFile, JSON.stringify(finalResult), 'utf-8');
    } else {
      this._logger.log('No output file specified.');
    }

    return finalResult;
  }

  _scrapePageByPage(paginator, maxPages, requestOptions, currentPage, currentElements) {
    // TODO: ES6 default values
    currentPage = currentPage || 1;
    currentElements = currentElements || [];
    this._logger.log('Requesting page #%d at %s%s...', currentPage, requestOptions.baseUrl, requestOptions.uri);

    return requestP(requestOptions)
      .then($ => {
        this._logger.log('Parsing page #%d...', currentPage);
        const newElements = this._parsePageContent($);
        currentElements.push(newElements);

        if (++currentPage > maxPages) {
          this._logger.log('Maximum page number reached (%d), done.', maxPages);
          return currentElements;
        }

        const followUri = paginator($);

        // notify GC
        // TODO: monitor mem and verify if it's necessary
        $ = null;

        if (followUri) {
          requestOptions.uri = followUri;
          return this._scrapePageByPage(paginator, maxPages, requestOptions, currentPage, currentElements);
        }

        this._logger.log('All pages scraped.');
        return currentElements;
      })
      .catch(err => {
        this._logger.error('Unexpected error while scraping page #%s', currentPage);
        this._logger.error(err);
        throw err; // re-throw for _scrape() catch handler
      });
  }

  _scrapeAllPages(paginator, requestOptions, currentPage) {
    // TODO: ES6 default values
    currentPage = currentPage || 1;
    this._logger.log('Requesting page #%d at %s%s...', currentPage, requestOptions.baseUrl, requestOptions.uri);

    return requestP(requestOptions)
      .then($ => {
        this._logger.log('Parsing page #%d...', currentPage);
        const newElements = this._parsePageContent($);
        const remainingPagesCount = (paginator($) || 1) - 1;
        const nextPagesNumbers = Array(remainingPagesCount).fill().map((n, i) => i + 2);

        if (remainingPagesCount) {
          this._logger.log('Requesting the %d remaining page(s) in parallel...', remainingPagesCount);
        }

        const promises = nextPagesNumbers.map(pageIndex => {
          const nextRequestOptions = Object.create(requestOptions);
          nextRequestOptions.qs[this._pagination.config.queryParam] = pageIndex;
          return this._scrapePageByPage(this._paginators.none, 1, nextRequestOptions, pageIndex);
        });

        return Promise.all(promises).then(allResults => {
          const flattened = allResults.reduce((prev, actual) => prev.concat(actual), []);
          flattened.unshift(newElements);
          return flattened;
        });
      });
  }

  _parsePageContent($) {
    const elementsConfig = this._elements;
    const elements = [];
    const parts = elementsConfig.parts;
    const partsNotFound = {};

    $(elementsConfig.container)
      .each((elementIndex, container) => {
        const $container = $(container);

        const newElement = parts.reduce((current, part) => {
          const $parts = $container.find(part.config.selector);
          const content = this._extractContent($parts, part.config);

          current[part.name] = content;

          if (!content || !content.length) {
            partsNotFound[part.name] = partsNotFound[part.name] || {
              count: 0,
              selector: part.config.selector
            };
            partsNotFound[part.name].count++;
          }

          return current;
        }, {});

        elements.push(newElement);
      });

    const elementsCount = elements.length;

    Object.keys(partsNotFound).forEach(name => {
      if (partsNotFound[name].count === elementsCount) {
        this._logger.warn('No content was found for "%s" in this page!', name);
        this._logger.warn('Are you sure "%s" is the adequate selector?', partsNotFound[name].selector);
      }
    });

    this._logger.log('%d element(s) found in this page.', elementsCount);

    return elements;
  }

  _extractContent($parts, config) {
    return this._applyFilter(config.filter, this._applyExtractor(config.extractor, $parts));
  }

  _applyFilter(filterName, content) {
    // TODO: ES6 default values
    filterName = filterName || 'identity';
    let filter = this._filters[filterName];
    if (!filter) {
      filter = this._filters.identity;
      this._logger.warn('Unknown filter "%s", defaults to "identity".', filterName);
    }
    return filter.call(this._filters, content);
  }

  _applyExtractor(extractorName, $parts) {
    // TODO: ES6 default values + let [extractorName, ...extractorParams] = extractorName.split(':');
    // handles combinations like "array:attr:src"
    const substrings = (extractorName || 'text').split(':');
    const mainExtractorName = substrings[0];

    let mainExtractor = this._extractors[mainExtractorName];
    if (!mainExtractor) {
      mainExtractor = this._extractors.text;
      this._logger.warn('Unknown extractor "%s", defaults to "text".', mainExtractorName);
    }

    if (mainExtractorName !== 'array') {
      return mainExtractor.call(this._extractors, $parts, substrings[1]);
    }

    const subExtractorName = substrings[1] || 'text';

    let subExtractor = this._extractors[subExtractorName];
    if (!subExtractor) {
      subExtractor = this._extractors.text;
      this._logger.warn('Unknown extractor "array:%s", defaults to "array:text".', subExtractorName);
    }

    subExtractor = subExtractor.bind(this._extractors);

    return mainExtractor.call(this._extractors, $parts, $p => subExtractor($p, substrings[2]));
  }
}

module.exports = JasonTheMiner;
/* eslint-enable no-console, no-param-reassign */
