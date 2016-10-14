const fs = require('fs');
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
   * @param  {Object} [options.fallbacks] Fallback processors for each category
   */
  constructor({ fallbacks } = {
    fallbacks: {
      load: 'identity',
      parse: 'html',
      paginate: 'no-action',
      transform: 'identity'
    }
  }) {
    this._processors = Object.assign({}, defaultProcessors);
    this._helpers = Object.assign({}, defaultParserHelpers);

    this._fallbacks = Object.keys(fallbacks).reduce((result, category) => {
      const name = fallbacks[category];
      result[category] = this._processors[category][name];
      return result;
    }, {});

    this._config = {
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
    if (!processor.prototype) {
      throw new TypeError(`Cannot register "${category}" processor "${name}"! Class expected.`);
    }
    if (typeof processor.prototype.run !== 'function') {
      throw new TypeError(`Cannot register "${category}" processor "${name}"! Missing "run" method.`);
    }
    if (['input', 'parse'].includes(category) && typeof processor.prototype.getRunContext !== 'function') {
      throw new TypeError(`Cannot register "${category}" processor "${name}"! Missing "getRunContext" method.`);
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
      throw new TypeError(`Cannot register helper "${name}"! Function expected.`);
    }

    this._helpers[category][name] = helper;
    debug('New "%s" helper registered: "%s"', category, name);
  }

  /**
   * (Re-)Configures each category.
   * @param  {Object} [options={}]
   * @param  {Object} [options.load]
   * @param  {Object} [options.parse]
   * @param  {Object} [options.paginate]
   * @param  {Object} [options.transform]
   * @return {Promise.<Object>}
   */
  configure(options) {
    ['load', 'parse', 'paginate', 'transform'].forEach(category => {
      if (options[category]) {
        this._config[category] = Object.assign({}, options[category]);
      }
    });
    debug('New config set', this._config);
    return Promise.resolve(this._config);
  }

  /**
   * Loads a JSON config file.
   * @param  {string} configFile The path to the JSON config
   * @return {Promise.<Object>}
   */
  loadConfig(configFile) {
    debug('Loading config file "%s"...', configFile);

    return new Promise((resolve, reject) => {
      fs.readFile(configFile, 'utf8', (error, configText) => {
        if (error) {
          debug(error);
          reject(error);
          return;
        }

        try {
          this.configure(JSON.parse(configText)).then(config => resolve(config));
        } catch (parseError) {
          debug(parseError);
          reject(parseError);
        }
      });
    });
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
  harvest({ load, parse, paginate, transform } = {}) {
    debug('Harvesting...');

    const loader = this._buildProcessor('load', load);
    const parser = this._buildProcessor('parse', parse);
    const paginator = this._buildProcessor('paginate', paginate);
    const transformer = this._buildProcessor('transform', transform);

    return this._paginate(loader, parser, paginator).then(results => transformer.run(results));
  }

  /**
   * @param  {Object} loader
   * @param  {Object} parser
   * @param  {Object} paginator
   * @param  {Object} loadConfig
   * @return {Promise.<Object[]>} A promise that is resolved with an array of results
   */
  _paginate(loader, parser, paginator, loadConfig) {
    return loader.run(loadConfig)
      .then(data => parser.run(data))
      .then(results => {
        debug('Paginating..?');
        const nextLoadConfig = paginator.run({
          loaderRunContext: loader.getRunContext(),
          parserRunContext: parser.getRunContext()
        });

        if (!nextLoadConfig) {
          return Promise.resolve(results);
        }

        return this._paginate(loader, parser, paginator, nextLoadConfig)
          .then(newResults => results.concat(newResults));
      });
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
    const categoryConfig = this._config[category] || {};
    const processorName = Object.keys(config)[0] || Object.keys(categoryConfig)[0];
    const Processor = categoryProcessors[processorName] || this._fallbacks[category];
    const customConfig = Object.assign({}, categoryConfig[processorName], config[processorName]);

    if (!processorName) {
      debug('No "%s" processor specified. Using fallback.', category);
    } else if (!categoryProcessors[processorName]) {
      debug('No "%s" processor found with the name "%s"! Using fallback.', category, processorName);
    }

    return category === 'parse' ? new Processor(customConfig, this._helpers) : new Processor(customConfig);
  }
}

module.exports = JasonTheMiner;
