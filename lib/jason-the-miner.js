const nodeUrl = require('url');
const nodePath = require('path');
const Bluebird = require('bluebird');
const get = require('lodash.get');
const set = require('lodash.set');
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
   * { load: 'identity', parse: 'identity', paginate: 'noop', transform: 'identity' }
   */
  constructor({ fallbacks = {} } = {}) {
    this._processors = Object.assign({}, defaultProcessors);
    this._helpers = Object.assign({}, defaultParserHelpers);

    this._fallbacks = {
      load: fallbacks.load || 'identity',
      parse: fallbacks.parse || 'identity',
      paginate: fallbacks.paginate || 'noop',
      transform: fallbacks.transform || 'identity'
    };

    this.config = {
      load: {},
      parse: {},
      paginate: {},
      transform: {}
    };

    debug('A new miner is born, and his name is Jason!');
    debug('processors', this._processors);
    debug('helpers', this._helpers);
    debug('fallbacks', this._fallbacks);
  }

  /**
   * Registers a new processor, i.e. a class that must implement the "run()" method.
   * In order to support pagination, the loaders and parsers must also implement a
   * "getRunContext()" method. See the "processors" subfolders for examples.
   * @param  {Object} options
   * @param  {string} options.category "load", "parse", "paginate" or "transform"
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

    if (['load', 'parse'].includes(category) && typeof processor.prototype.getRunContext !== 'function') {
      throw new TypeError(`Invalid processor "${name}"! Missing "getRunContext" method.`);
    }

    const processors = this._processors[category];
    processors[name] = processor;
    debug('New "%s" processor registered: "%s"', category, name);
  }

  /**
   * Registers a new parser helper, a function that helps extracting or filtering data during the
   * parsing process.
   * @param  {Object} options
   * @param  {string} options.category "extract" or "filter"
   * @param  {string} options.name
   * @param  {Function} options.helper A helper function, see the "processors/parsers/helpers"
   * folder for examples
   */
  registerHelper({ category, name, helper }) {
    if (typeof helper !== 'function') {
      throw new TypeError(`Invalid helper "${name}"! Function expected.`);
    }
    this._helpers[category][name] = helper;
    debug('New "%s" helper registered: "%s"', category, name);
  }

  /**
   * Loads a JSON config file.
   * @param  {string} configPath The path to the JSON config
   * @return {Promise.<Object>}
   */
  loadConfig(configPath) {
    debug('Loading config file "%s"...', configPath);

    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const config = require(configPath);

      ['load', 'parse', 'paginate', 'transform'].forEach(category => {
        if (config[category]) {
          this.config[category] = { ...config[category] };
          debug('"%s" config set', category, this.config[category]);
        }
      });

      return Promise.resolve(config);
    } catch (error) {
      debug(error);
      return Promise.reject(error);
    }
  }

  /**
   * Launches the whole process:
   * 1) load >>> 2) parse & extract >>> 3) transform the extracted data.
   * If a pagination config is passed, 1) and 2) are repeated accordingly.
   * @param  {Object} [options={}] An optional config that can override the current one
   * @param  {Object} [options.load]
   * @param  {Object} [options.parse]
   * @param  {Object} [options.paginate]
   * @param  {Object} [options.transform]
   * @return {Promise.<Object[]>} A promise that is resolved with an array of results
   */
  async harvest({ load, parse, paginate, transform } = {}) {
    debug('Harvesting...');

    const loader = this._buildProcessor('load', load);
    const parser = this._buildProcessor('parse', parse);
    const paginator = this._buildProcessor('paginate', paginate);
    const transformer = this._buildProcessor('transform', transform);

    const result = await this._loadAndParse({ loader, parser, paginator });
    return transformer.run(result);
  }

  /**
   * @param  {Object} loader
   * @param  {Object} parser
   * @param  {Object} paginator
   * @param  {Object} loadParams
   * @param  {Object} parseSchema
   * @return {Promise.<Object[]>} A promise that is resolved with an array of results
   */
  async _loadAndParse({ loader, parser, paginator, loadParams, parseSchema }) {
    const data = await loader.run(loadParams);
    let { result, follow, schema } = await parser.run(data, parseSchema);

    if (!follow) {
      debug('No links to follow, done harvesting.');
      return result;
    }

    const concurrenciesP = Object.keys(follow)
      .map((concurrency) => {
        const linksAndPaths = follow[concurrency];

        debug('Following %d link(s) at concurrency=%d...', linksAndPaths.length, concurrency);

        return Bluebird.map(
          linksAndPaths,
          async ({ link, path }) => {
            const followSchema = get(schema, path.concat('_follow'));
            const followLoadParams = { ...loader.getRunContext() };

            if (link[0] === '/') {
              followLoadParams.url = link;
            } else if (link.match(/^https?:\/\//)) {
              followLoadParams.baseURL = link;
              followLoadParams.url = '';
            } else {
              const { pathname } = nodeUrl.parse(followLoadParams.url);
              followLoadParams.url = nodePath.join(pathname, link);
            }

            const followResult = await this._loadAndParse({
              loader,
              parser,
              paginator,
              loadParams: followLoadParams,
              parseSchema: followSchema,
            });

            debug('Merging follow result to path', path);

            if (path.length) {
              set(result, path, followResult);
            } else {
              result = { ...result, ...followResult };
            }
            debug('path', path);
          },
          { concurrency: +concurrency },
        );
      });

    await Promise.all(concurrenciesP);

    return result;

        /* debug('Paginating..?');

        const pagination = paginator.run({
          loaderRunContext: loader.getRunContext(),
          parserRunContext: parser.getRunContext()
        });

        // base case
        if (!pagination) {
          return Promise.resolve(results);
        }

        if (!pagination.runConfigs || !pagination.concurrency) {
          debug('Invalid pagination object! Stopping.', pagination);
          return Promise.resolve(results);
        }

        const { runConfigs, concurrency } = pagination;

        // recursive case
        const allNextP = Bluebird.map(runConfigs, runConfig => {
          // reflect to avoid map() to fail
          return this._loadAndParse(loader, parser, paginator, runConfig)
            .catch(error => ({ _error: this._formatRunError(error) }));
        }, {
          concurrency
        });

        return allNextP.then(allNextResults => {
          const schemaNames = Object.keys(results);

          schemaNames.forEach(name => {
            allNextResults.forEach(nextResults => {
              if (nextResults._error) {
                results._errors = results._errors || [];
                results._errors.push(nextResults._error);
              }

              if (!Array.isArray(results[name])) {
                // might happen when paginating and parsing with the "identity" processor
                debug('Invalid results for schema "%s"! Expected "array", received "%s".', name, typeof results[name]);
                return;
              }

              results[name] = results[name].concat(nextResults[name]);
            });
          });

          return Promise.resolve(results);
        }); */
  }

  /**
   * Cleans Axios error object (if it's an Axios error).
   * @param {Error}
   * @return {Error}
   */
  _formatRunError(error) { // eslint-disable-line
    error.msg = error.toString();

    const errorConfig = error.config;
    if (errorConfig) {
      delete errorConfig.transformRequest;
      delete errorConfig.transformResponse;
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

    return category === 'parse' ? new Processor(customConfig, this._helpers) : new Processor(customConfig);
  }
}

module.exports = JasonTheMiner;
