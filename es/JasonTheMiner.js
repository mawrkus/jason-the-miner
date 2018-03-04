const Bluebird = require('bluebird');
const get = require('lodash.get');
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
   * In order to support pagination, the loaders and parsers must also implement a
   * "getRunContext()" method. See the "processors" subfolders for examples.
   * @param  {Object} options
   * @param  {string} options.category "load", "parse" or "transform"
   * @param  {string} options.name
   * @param  {Processor} options.processor A processor class
   */
  registerProcessor({ category, name, processor }) {
    if (!processor || !processor.prototype) {
      throw new TypeError(`Invalid processor "${name}"! Class expected.`);
    }

    if (typeof processor.prototype.run !== 'function') {
      throw new TypeError(`Invalid processor "${name}"! Missing "run" method.`);
    }

    if (
      category === 'load' && (
        processor.prototype.getConfig !== 'function' ||
        processor.prototype.buildLoadParams !== 'function'
      )
    ) {
      throw new TypeError(`Invalid processor "${name}"! Missing "getConfig" and/or "buildLoadParams" method.`);
    }

    const processors = this._processors[category];
    processors[name] = processor;
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
      const config = require(configPath);

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
      const parsed = await this._loadAndParse({ loader, parser });
      return transformer.run(parsed);
    } catch (error) {
      this._formatError(error);
      throw error;
    }
  }

  /**
   * @param  {Object} loader
   * @param  {Object} parser
   * @param  {Object} [loadParams]
   * @param  {Object} [parseSchema]
   * @return {Promise.<Object}
   */
  async _loadAndParse({
    loader,
    parser,
    loadParams,
    parseSchema,
  }) {
    const data = await loader.run(loadParams);
    const { result, follow, schema } = await parser.run(data, parseSchema);

    if (!follow || !follow.length) {
      debug('No links follow, done harvesting.');
      return result;
    }

    const { concurrency = 1 } = loader.getConfig();

    debug('Following %d link(s) with concurrency=%d...', follow.length, concurrency);

    await Bluebird.map(
      follow,
      async ({ link, schemaPath, parsedPath }) => {
        // TODO: deal with errors
        const followResult = await this._loadAndParse({
          loader,
          parser,
          loadParams: loader.buildLoadParams({ link }),
          parseSchema: get(schema, schemaPath),
        });

        // debug('schemaPath', schemaPath);
        // debug('schema', schema);
        // debug('parsedPath', parsedPath);
        // debug('followResult', followResult);

        const partialResult = !parsedPath.length ? result : get(result, parsedPath);
        Object.assign(partialResult, followResult);
      },
      { concurrency },
    );

    return result;
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
