const path = require('path');
const Bluebird = require('bluebird');
const get = require('lodash.get');
const mergeWith = require('lodash.mergewith');
const uuid = require('uuid/v1');
const debug = require('debug')('jason:core');

const defaultProcessors = require('./processors');
const defaultParserHelpers = require('./processors/parsers/helpers');

/**
 * Web harvester aka Jason the Miner.
 * See the "demos" folder for examples.
 * @see ../demos/index.js
 */
class JasonTheMiner {
  /**
   * Creates a new instance and registers the default processors and the default parse helpers.
   * @param  {Object} [options={}]
   * @param  {Object} [options.fallbacks] Fallback processors for each category, defaults to
   * { bulk: null, load: 'identity', parse: 'identity', transform: 'identity' }
   */
  constructor({ fallbacks = {} } = {}) {
    this._processors = { ...defaultProcessors };
    this._parseHelpers = { ...defaultParserHelpers };

    this._fallbacks = {
      bulk: null,
      load: 'identity',
      parse: 'identity',
      transform: 'identity',
      ...fallbacks,
    };

    this.config = {
      bulk: null,
      load: null,
      parse: null,
      transform: null,
    };

    debug('A new miner is born, and his name is Jason!');
    debug('processors', this._processors);
    debug('processors fallbacks', this._fallbacks);
    debug('parse helpers', this._parseHelpers);
  }

  /**
   * Registers a new processor, i.e. a class that must implement the "run()" method.
   * The loaders must also implement the "getConfig()", "buildPaginationLinks()" and
   * "buildLoadOptions()" methods.
   * See the "processors" subfolders for examples.
   * @param  {Object} options
   * @param  {string} options.category "load", "parse" or "transform"
   * @param  {string} options.name
   * @param  {Processor} options.processor A processor class
   */
  registerProcessor({ category, name, processor }) {
    if (!['load', 'parse', 'transform'].includes(category)) {
      throw new Error(`Unknown processor category "${category}"!`);
    }

    if (!processor || !processor.prototype) {
      throw new TypeError(`Invalid processor "${name}"! Class expected.`);
    }

    if (typeof processor.prototype.run !== 'function') {
      throw new TypeError(`Invalid "${category}" processor "${name}"! Missing method.`);
    }

    if (
      category === 'load' && (
        typeof processor.prototype.getConfig !== 'function' ||
        typeof processor.prototype.buildLoadOptions !== 'function'
      )
    ) {
      throw new TypeError(`Invalid "load" processor "${name}"! Missing method.`);
    }

    this._processors[category][name] = processor;
    debug('New "%s" processor registered: "%s"', category, name);
  }

  /**
   * Registers a new parser helper, a function that helps matching, extracting or filtering data
   * during the parsing process.
   * @param  {Object} options
   * @param  {string} options.category "match", "extract" or "filter"
   * @param  {string} options.name
   * @param  {Function} options.helper A helper function, see the "processors/parsers/helpers"
   * folder for examples
   */
  registerHelper({ category, name, helper }) {
    if (typeof helper !== 'function') {
      throw new TypeError(`Invalid helper "${name}"! Function expected.`);
    }

    if (!['match', 'extract', 'filter'].includes(category)) {
      throw new Error(`Unknown helper category "${category}"!`);
    }

    this._parseHelpers[category][name] = helper;
    debug('New "%s" helper registered: "%s"', category, name);
  }

  /**
   * Loads a JSON/JS config file.
   * @param  {string} configPath The path to the config file
   * @return {Promise}
   */
  loadConfig(configPath) {
    debug('Loading config file "%s"...', configPath);

    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const config = require(path.join(process.cwd(), configPath));

      this.config = {
        bulk: null,
        load: null,
        parse: null,
        transform: null,
      };

      ['bulk', 'load', 'parse', 'transform']
        .filter(category => !!config[category])
        .forEach((category) => {
          this.config[category] = Array.isArray(config[category]) ?
            // eslint-disable-next-line array-bracket-spacing
            [ ...config[category] ] :
            { ...config[category] };

          debug('"%s" config set', category, this.config[category]);
        });

      return Promise.resolve(config);
    } catch (error) {
      debug(error);
      return Promise.reject(error);
    }
  }

  /**
   * @param  {Object} [options={}] Optional configs that can override the current ones
   * @param  {Object} [options.bulk]
   * @param  {Object} [options.load]
   * @param  {Object} [options.parse]
   * @param  {Object|Array} [options.transform]
   * @return {Promise}
   */
  async harvest(configs = {}) {
    debug('Harvesting...');

    const currentConfigs = this._resolveConfigs(configs);
    const { bulk } = currentConfigs;

    if (!bulk) {
      return this._harvest(currentConfigs);
    }

    debug('Bulk harvesting...');

    const bulkLoader = this._buildProcessor('load', bulk);
    const bulkParamsList = await bulkLoader.run();

    debug('%d set(s) of params loaded.', bulkParamsList.length);
    debug(bulkParamsList);

    const bulkConfigsList = bulkParamsList
      .map(params => this._renderConfigs(currentConfigs, params));

    const bulkIterationsCount = bulkConfigsList.length;

    debug('%d config(s) rendered...', bulkIterationsCount);
    debug(bulkConfigsList);

    const bulkResults = [];
    let remainingCount = bulkIterationsCount;

    /* eslint-disable no-restricted-syntax, no-await-in-loop */
    for (const bulkConfigs of bulkConfigsList) {
      debug('%d bulk iteration(s) remaining...', remainingCount);

      const results = await this._harvest(bulkConfigs);
      bulkResults.push(results);

      remainingCount -= 1;
    }

    return bulkResults;
  }

  /**
   * Launches the whole process: (load > parse) * m ---> transform * n
   * @param  {Object} config
   * @param  {Object} config.load
   * @param  {Object} config.parse
   * @param  {Object|Array} config.transform
   * @throws
   * @return {Promise}
   */
  async _harvest({ load, parse, transform }) {
    const loader = this._buildProcessor('load', load);
    const parser = this._buildProcessor('parse', parse);

    const transforms = Array.isArray(transform) ? transform : [transform];
    const transformers = transforms.map(t => this._buildProcessor('transform', t));

    try {
      const parseResults = await this._crawl({ loader, parser });

      let transformedResults = { results: parseResults };
      let transformParams = { parseResults, results: parseResults };

      /* eslint-disable no-restricted-syntax, no-await-in-loop */
      for (const t of transformers) {
        transformedResults = await t.run(transformParams);
        transformParams = { ...transformedResults, parseResults };
      }
      /* eslint-enable no-restricted-syntax, no-await-in-loop */

      delete transformedResults.parseResults;

      return transformedResults;
    } catch (error) {
      this._formatError(error);
      throw error;
    }
  }

  /**
   * @param  {Loader} loader
   * @param  {Parser} parser
   * @param  {Array} [options.loadOptionsList=[{}]]
   * @return {Promise}
   */
  async _crawl({ loader, parser, loadOptionsList = [{}] }) {
    const { concurrency = 1 } = loader.getConfig();

    const root = {
      id: 1,
      parent: null,
      result: {},
      children: {},
    };

    const crawls = loadOptionsList
      .map(loadOptions => ({
        loadOptions,
        parent: root,
        mergePath: [],
        level: 0,
      }));

    await this._crawLinks({
      crawls,
      loader,
      concurrency,
      parser,
    });

    return root.result;
  }

  /**
   * @param  {Array} crawls
   * @param  {Loader} loader
   * @param  {number} concurrency
   * @param  {Parser} parser
   * @return {Promise}
   */
  async _crawLinks({
    crawls,
    loader,
    concurrency,
    parser,
  }) {
    debug('Crawling %d link(s) at max concurrency=%d...', crawls.length, concurrency);

    let currentCrawls = crawls;

    do {
      // eslint-disable-next-line no-await-in-loop
      const crawlResults = await Bluebird.map(
        currentCrawls,
        (async (crawl) => {
          const {
            loadOptions,
            schema,
            parent,
            mergePath,
            level,
          } = crawl;

          const parserResult = await this._crawLink({
            loader,
            loadOptions,
            parser,
            schema,
          });

          return {
            loader,
            parent,
            mergePath,
            parserResult,
            level,
          };
        }),
        { concurrency },
      );

      currentCrawls = this._processCrawlResults({ crawlResults });

      debug('Found %d more link(s) to crawl.', currentCrawls.length);
    } while (currentCrawls.length);
  }

  /**
   * @param  {Object} loadOptions
   * @param  {Loader} loader
   * @param  {Parser} parser
   * @param  {Object} schema
   * @return {Promise}
   */
  async _crawLink({
    loadOptions,
    loader,
    parser,
    schema,
  }) {
    debug('Crawling...', loadOptions);
    try {
      const loadResult = await loader.run({ options: loadOptions });
      return parser.run({ data: loadResult, schema });
    } catch (error) {
      debug(error);
      return {
        result: {
          _errors: [this._formatError(error)],
        },
        schema,
        follows: [],
        paginates: [],
      };
    }
  }

  /**
   * @param  {Array} crawlResults
   * @return {Array}
   */
  _processCrawlResults({ crawlResults }) {
    debug('Processing %d crawl result(s)...', crawlResults.length);

    let allNextCrawls = [];
    const nodesToMerge = [];

    crawlResults.forEach((crawlResult) => {
      const { parent, mergePath, parserResult } = crawlResult;
      const { result } = parserResult;

      const id = uuid();
      const newNode = {
        id,
        parent,
        mergePath,
        result,
        children: {},
      };
      parent.children[id] = newNode;

      const nextCrawls = this._getNextCrawls({ crawlResult, parent: newNode });

      if (nextCrawls.length) {
        allNextCrawls = [...allNextCrawls, ...nextCrawls];
      } else {
        nodesToMerge.push(newNode);
      }
    });

    // as the merging process depends on the total number of children of a given node,
    // this must be done here, after adding all leaf nodes
    nodesToMerge.forEach(leafNode => this._mergePartialResults({ leafNode }));

    return allNextCrawls;
  }

  /**
   * @param  {Object} crawlResult
   * @param  {Object} parent
   * @return {Array}
   */
  // eslint-disable-next-line class-methods-use-this
  _getNextCrawls({ crawlResult, parent }) {
    const { loader, parserResult, level } = crawlResult;
    const { schema, follows, paginates } = parserResult;

    const filteredPaginates = paginates
      .filter(({ depth }) => level < depth)
      .map(p => ({ ...p, isPaginated: true }));

    const nextCrawls = [...follows, ...filteredPaginates].map((follow) => {
      const {
        link,
        schemaPath,
        parsedPath,
        isPaginated,
      } = follow;

      return {
        loadOptions: loader.buildLoadOptions({ link }),
        schema: !schemaPath.length ? schema : get(schema, schemaPath),
        parent,
        mergePath: parsedPath,
        level: isPaginated ? level + 1 : level,
      };
    });

    return nextCrawls;
  }

  /**
   * Starting from a leaf node in the tree of partial results, this function goes up to merge them
   * all until it reaches the root or a node that has still some pending results (we basically
   * emulates what the stack and recursive calls would give us if we didn't care about limiting the
   * loads concurrency)
   * @param  {Object} leafNode
   */
  _mergePartialResults({ leafNode }) {
    let currentNode = leafNode;

    do {
      const { result, parent, mergePath } = currentNode;

      this._mergeResults({
        result,
        to: parent.result,
        mergePath,
      });

      delete currentNode.parent;
      delete parent.children[currentNode.id];

      if (Object.keys(parent.children).length > 0) {
        break;
      }

      currentNode = parent;
    } while (currentNode.parent);
  }

  /**
   * @param  {Object} result
   * @param  {Object} to
   * @param  {string} mergePath
   */
  // eslint-disable-next-line class-methods-use-this
  _mergeResults({ result, to, mergePath }) {
    const dest = !mergePath.length ? to : get(to, mergePath);

    // eslint-disable-next-line consistent-return
    mergeWith(dest, result, (obj, src) => {
      if (Array.isArray(obj)) {
        return obj.concat(src);
      }
    });
  }

  /**
   * Cleans Axios error object if it's an Axios error, so it can be nicely saved/logged.
   * @param {Error}
   * @return {Error}
   */
  // eslint-disable-next-line class-methods-use-this
  _formatError(error) {
    const { config, request, response } = error;

    if (config) {
      delete config.adapter;
      delete config.transformRequest;
      delete config.transformResponse;
      delete config.validateStatus;
    }

    if (request) {
      delete error.request; // eslint-disable-line no-param-reassign
    }

    if (response) {
      delete response.config;
      delete response.request;
      delete response.data;
    }

    // to be readable after stringifying
    error.msg = error.msg || error.toString(); // eslint-disable-line no-param-reassign

    return error;
  }

  /**
   * @param  {string} category "load", "parse", "paginate" or "transform"
   * @param  {Object} [config]
   * @return {Object} processor
   */
  _buildProcessor(category, config = {}) {
    const processorName = Object.keys(config)[0];
    const fallbackName = this._fallbacks[category];
    const categoryProcessors = this._processors[category];
    const Processor = categoryProcessors[processorName] || categoryProcessors[fallbackName];

    if (!processorName) {
      debug('No "%s" processor specified. Using fallback "%s".', category, fallbackName);
    } else if (!categoryProcessors[processorName]) {
      debug('No "%s" processor found with the name "%s"! Using fallback "%s".', category, processorName, fallbackName);
    }

    const processorConfig = config[processorName];

    return category === 'parse' ?
      new Processor({ config: processorConfig, helpers: this._parseHelpers, category }) :
      new Processor({ config: processorConfig, category });
  }

  /**
   * @param  {Object} configs
   * @param  {Object} [configs.bulk]
   * @param  {Object} [configs.load]
   * @param  {Object} [configs.parse]
   * @param  {Object} [configs.transform]
   * @return {Object}
   */
  _resolveConfigs(configs) {
    debug('Resolving current configs...');

    const currentConfigs = ['bulk', 'load', 'parse', 'transform']
      .reduce(
        (acc, category) => {
          let config = configs[category];
          if (config) {
            debug(' -> using "%s" config passed as parameter.', category);
            acc[category] = config;
            return acc;
          }

          config = this.config[category];
          if (config) {
            debug('-> using "%s" config previously set.', category);
            acc[category] = config;
            return acc;
          }

          debug('-> no "%s" config passed or set.', category);
          return acc;
        },
        {},
      );

    return currentConfigs;
  }

  /**
    E.g.:
      configs = {
        "load": {
          "baseURL": "https://github.com",
          "url": "/search?l={language}&o=desc&q={query},
          "_concurrency": 42
        },
        ...
      }

      params = [{ language: 'JavaScript', query: 'scraper' }]

      --->

      [{
        "load": {
          "baseURL": "https://github.com",
          "url": "/search?l=JavaScript&o=desc&q=scraper
        },
        ...
      }]
   * @param  {Object} configs
   * @param  {Object} [configs.bulk]
   * @param  {Object} [configs.load]
   * @param  {Object} [configs.parse]
   * @param  {Object} [configs.transform]
   * @param  {Object} params
   * @return {Object[]}
   */
  // eslint-disable-next-line class-methods-use-this
  _renderConfigs(configs, params) {
    const renderedConfigs = ['load', 'parse', 'transform'].reduce(
      (acc, category) => {
        const sourceConfig = configs[category];
        const destConfig = Array.isArray(sourceConfig) ? [] : {};

        acc[category] = mergeWith(
          destConfig,
          sourceConfig,
          // eslint-disable-next-line consistent-return
          (destValue, srcValue) => {
            if (typeof srcValue === 'string') {
              return Object.keys(params).reduce(
                (renderedString, param) => renderedString.replace(`{${param}}`, params[param]),
                srcValue,
              );
            }
          },
        );

        return acc;
      },
      {},
    );

    return renderedConfigs;
  }
}

module.exports = JasonTheMiner;
