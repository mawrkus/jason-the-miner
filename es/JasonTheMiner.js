const path = require('path');
const Bluebird = require('bluebird');
const get = require('lodash.get');
const mergeWith = require('lodash.mergewith');
const debug = require('debug')('jason:core');

const defaultProcessors = require('./processors');
const defaultParserHelpers = require('./processors/parsers/helpers');

/**
 * Web harvester aka Jason the Miner.
 * See the "demo" folder for usage examples.
 * @see ../demo/index.js
 */
class JasonTheMiner {
  /**
   * Creates a new instance and registers the default processors (defined in "processors/index.js")
   * and the default parse helpers (defined in "processors/parsers/index.js").
   * @param  {Object} [options={}]
   * @param  {Object} [options.fallbacks] Fallback processors for each category, defaults to
   * { load: 'identity', parse: 'identity', transform: 'identity' }
   */
  constructor({ fallbacks = {} } = {}) {
    this._processors = { ...defaultProcessors };
    this._parseHelpers = { ...defaultParserHelpers };

    this._fallbacks = {
      load: 'identity',
      parse: 'identity',
      transform: 'identity',
      ...fallbacks,
    };

    this.config = {
      load: {},
      parse: {},
      transform: {},
    };

    debug('A new miner is born, and his name is Jason!');
    debug('processors', this._processors);
    debug('processors fallbacks', this._fallbacks);
    debug('parse helpers', this._parseHelpers);
  }

  /**
   * Registers a new processor, i.e. a class that must implement the "run()" method.
   * The loaders and parsers must also implement the "getConfig()" and "buildLoadParams()" methods.
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
      throw new TypeError(`Invalid processor "${name}"! Missing "run" method.`);
    }

    if (
      category === 'load' && (
        typeof processor.prototype.getConfig !== 'function' ||
        typeof processor.prototype.buildPaginationLinks !== 'function' ||
        typeof processor.prototype.buildLoadOptions !== 'function'
      )
    ) {
      throw new TypeError(`Invalid load processor "${name}"! Missing "getConfig" and/or "buildLoadParams" method.`);
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
   * Loads a JSON config file.
   * @param  {string} configPath The path to the JSON config
   * @return {Promise.<Object|Error>}
   */
  loadConfig(configPath) {
    debug('Loading config file "%s"...', configPath);

    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const config = require(path.join(process.cwd(), configPath));

      ['load', 'parse', 'transform']
        .filter(category => !!config[category])
        .forEach((category) => {
          this.config[category] = { ...config[category] };
          debug('"%s" config set', category, this.config[category]);
        });

      return Promise.resolve(config);
    } catch (error) {
      debug(error);
      return Promise.reject(error);
    }
  }

  /**
   * Launches the whole process: load > parse > transform.
   * @param  {Object} [options={}] An optional config that can override the current one
   * @param  {Object} [options.load]
   * @param  {Object} [options.parse]
   * @param  {Object} [options.transform]
   * @throws
   * @return {Promise.<Object>}
   */
  async harvest({ load, parse, transform } = {}) {
    debug('Harvesting...');

    const loader = this._buildProcessor('load', load);
    const parser = this._buildProcessor('parse', parse);
    const transformer = this._buildProcessor('transform', transform);

    try {
      const results = await this._harvest({ loader, parser });
      return transformer.run({ results }); // TODO: support array of transformers ?
    } catch (error) {
      this._formatError(error);
      throw error;
    }
  }

  /**
   * @param  {Loader} loader
   * @param  {Parser} parser
   * @return {Promise.<Object>}
   */
  async _harvest({ loader, parser }) {
    const { concurrency = 1 } = loader.getConfig();
    const paginationLinks = loader.buildPaginationLinks();

    const root = {
      parent: null,
      result: {},
      children: [],
      childrenCount: 0,
    };

    const crawls = paginationLinks
      .map(link => ({
        link,
        parent: root,
        mergePath: [],
        level: 0,
      }));

    root.childrenCount = crawls.length;

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

    const crawlResults = await Bluebird.map(
      crawls,
      (async (crawl) => {
        const {
          link,
          schema,
          parent,
          mergePath,
          level,
        } = crawl;

        const parserResult = await this._crawLink({
          loader,
          link,
          parser,
          schema,
        });

        return {
          parent,
          mergePath,
          parserResult,
          level,
        };
      }),
      { concurrency },
    );

    const nextCrawls = this._processCrawlResults({ crawlResults });

    debug('Found %d more link(s) to crawl.', nextCrawls.length);

    if (nextCrawls.length) {
      // recursive case
      await this._crawLinks({
        crawls: nextCrawls,
        loader,
        concurrency,
        parser,
      });
    }
  }

  /**
   * @param  {string} link
   * @param  {Loader} loader
   * @param  {Parser} parser
   * @param  {Object} [schema]
   * @return {Promise}
   */
  async _crawLink({
    link,
    loader,
    parser,
    schema,
  }) {
    debug('Crawling "%s"...', link);
    try {
      const options = loader.buildLoadOptions({ link });
      const loadResult = await loader.run({ options });
      return parser.run({ data: loadResult, schema });
    } catch (error) {
      debug(error);
      return {
        result: {
          _errors: [this._formatError(error)],
        },
        follows: [],
        paginates: [],
      };
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _processCrawlResults({ crawlResults }) {
    debug('Processing %d crawl result(s)...', crawlResults.length);

    let nextCrawls = [];

    crawlResults.forEach((crawlResult) => {
      const {
        parent,
        mergePath,
        parserResult,
        level,
      } = crawlResult;

      const {
        result,
        schema,
        follows,
        paginates,
      } = parserResult;

      const filteredPaginates = paginates
        .filter(({ depth }) => level < depth)
        .map(p => ({ ...p, isPaginated: true }));

      let nextFollows = [...follows, ...filteredPaginates];

      const newParent = {
        parent,
        mergePath,
        result,
        childrenCount: nextFollows.length,
        children: [],
      };

      parent.children.push(newParent);

      nextFollows = nextFollows.map((follow) => {
        const {
          link,
          schemaPath,
          parsedPath,
          isPaginated,
        } = follow;

        return {
          link,
          schema: !schemaPath.length ? schema : get(schema, schemaPath),
          parent: newParent,
          mergePath: parsedPath,
          level: isPaginated ? level + 1 : level,
        };
      });

      if (nextFollows.length) {
        nextCrawls = [...nextCrawls, ...nextFollows];
      } else {
        this._mergePartialResults({ leafNode: newParent });
      }
    });

    return nextCrawls;
  }

  _mergePartialResults({ leafNode }) {
    let node = leafNode;

    do {
      const { result, parent, mergePath } = node;

      this._mergeResults({
        result,
        to: parent.result,
        mergePath,
      });

      parent.childrenCount -= 1;

      if (parent.childrenCount > 0) {
        break;
      }

      parent.children = null;

      node = parent;
    } while (node.parent);
  }

  // eslint-disable-next-line class-methods-use-this
  _mergeResults({ result, to, mergePath }) {
    const dest = !mergePath || !mergePath.length ? to : get(to, mergePath);

    // eslint-disable-next-line consistent-return
    mergeWith(dest, result, (obj, src) => {
      if (Array.isArray(obj)) {
        return obj.concat(src);
      }
    });

    return to;
  }

  /**
   * Cleans Axios error object if it's an Axios error, so it can be nicely saved/logged.
   * @param {Error}
   * @return {Error}
   */
  // eslint-disable-next-line class-methods-use-this
  _formatError(error) {
    const errorConfig = error.config;
    if (errorConfig) {
      delete errorConfig.adapter;
      delete errorConfig.transformRequest;
      delete errorConfig.transformResponse;
      delete errorConfig.validateStatus;
    }

    if (error.request) {
      delete error.request; // eslint-disable-line no-param-reassign
    }

    const errorResponse = error.response;
    if (errorResponse) {
      delete errorResponse.config;
      delete errorResponse.request;
      delete errorResponse.data;
    }

    // to have a readable after stringifying
    error.msg = error.msg || error.toString(); // eslint-disable-line no-param-reassign

    return error;
  }

  /**
   * Creates a new instance of a processor from a given category.
   * If the processor cannot be created (because the configuration doesn't specify a processor
   * previously registered), this function returns the fallback processor defined for each
   * category.
   * @param  {string} category "load", "parse", "paginate" or "transform"
   * @param  {Object} [config={}] An optional config that can override the current category config
   * @return {Object} processor
   */
  _buildProcessor(category, config = {}) {
    const categoryProcessors = this._processors[category];
    const categoryConfig = this.config[category] || {};
    const processorName = Object.keys(config)[0] || Object.keys(categoryConfig)[0];
    const fallbackName = this._fallbacks[category];
    const Processor = categoryProcessors[processorName] || categoryProcessors[fallbackName];
    const customConfig = Object.assign({}, categoryConfig[processorName], config[processorName]);

    if (!processorName) {
      debug('No "%s" processor specified. Using fallback "%s".', category, fallbackName);
    } else if (!categoryProcessors[processorName]) {
      debug('No "%s" processor found with the name "%s"! Using fallback "%s".', category, processorName, fallbackName);
    }

    return category === 'parse' ? new Processor(customConfig, this._parseHelpers) : new Processor(customConfig);
  }
}

module.exports = JasonTheMiner;
