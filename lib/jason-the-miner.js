const debug = require('debug')('jason:core');

const defaultProcessors = require('./processors');
const defaultParseHelpers = require('./processors/parse/helpers');

/**
 * Jason the Miner aka the Web scraper.
 * See the "demo" folder for usage examples.
 * @see ../demo/index.js
 */
class JasonTheMiner {
  /**
   * Creates a new instance and registers the default processors (defined in "processors/index.js")
   * and the default parse helpers (defined in "processors/parse/index.js").
   * Additional processors and helpers can be passed as parameters.
   * @param  {Object} [options={}]
   * @param  {Object} [options.processors] An additional set of processors to register
   * @param  {Object} [options.helpers] An additional set of parse helpers to register
   */
  constructor({ processors, helpers } = {}) {
    this._processors = Object.assign({}, defaultProcessors, processors);
    this._helpers = Object.assign({}, defaultParseHelpers, helpers);
    this._config = {};

    debug('A new miner is born, and his name is Jason!');
    debug('processors', this._processors);
    debug('parse helpers', this._helpers);
  }

  /**
   * Registers a new processor, i.e. a class that must implement the "run()" method.
   * In order to support pagination, the "input" and "parse" processors must also  implement
   * a "getRunContext()" method. See the "processors" subfolders for examples.
   * @param  {Object} options
   * @param  {string} options.category "input", "parse", "paginate" or "output"
   * @param  {string} options.name
   * @param  {Processor} options.processor A processor class, see the "processors" folder for
   * examples
   */
  registerProcessor({ category, name, processor }) {
    const processors = this._processors[category];
    processors[name] = processor;
    debug('New "%s" processor registered: "%s"', category, name);
  }

  /**
   * Registers a new parse helper, a function that helps extracting or filtering data during the
   * parsing process.
   * @param  {Object} options
   * @param  {string} options.category "extractors" or "filters"
   * @param  {string} options.name
   * @param  {Function} options.helper A helper function, see the "processors/parse/helpers" folder
   * for examples
   */
  registerHelper({ category, name, helper }) {
    this._helpers[category][name] = helper;
    debug('New "%s" helper registered: "%s"', category, name);
  }

  /**
   * Loads a JSON config file.
   * @param  {string} configFile The path to the JSON config
   * @return {Promise.<Object>}
   */
  loadConfig(configFile) {
    debug('Loading config file "%s"...', configFile);
    return new Promise((resolve, reject) => {
      try {
        const config = require(configFile); // eslint-disable-line
        this._config = Object.assign({}, config);

        debug('Config loaded.', this._config);
        resolve(config);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Launches the whole process:
   * 1) loading data >>> 2) parsing data >>> 3) writing the extracted data.
   * If a valid pagination config has been specified, 1) and 2) are repeated accordingly.
   * @param  {Object} [options={}]
   * @param  {Object} [options.loadConfig]
   * @param  {Object} [options.parseConfig]
   * @param  {Object} [options.outputConfig]
   * @param  {Object} [options.paginationConfig]
   * @return {Promise.<Object[]>} A promise that is resolved with an array of results
   */
  harvest({ loadConfig, parseConfig, outputConfig, paginationConfig } = {}) {
    debug('Harvesting...');
    const loader = this._buildProcessor('input', loadConfig);
    const parser = this._buildProcessor('parse', parseConfig);
    const writer = this._buildProcessor('output', outputConfig);
    const paginator = this._buildProcessor('paginate', paginationConfig);

    return this._paginate(loader, parser, paginator).then(results => writer.run(results));
  }

  /**
   * @param  {Object} loader
   * @param  {Object} parser
   * @param  {Object} paginator
   * @param  {Object} [loadConfig={}]
   * @return {Promise.<Object[]>} A promise that is resolved with an array of results
   */
  _paginate(loader, parser, paginator, loadConfig = {}) {
    return loader.run(loadConfig)
      .then(input => parser.run(input))
      .then(results => {
        debug('Paginating..?');
        const nextLoadConfig = paginator.run(loader.getRunContext(), parser.getRunContext());
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
   * category. See "index.js" in each processor subfolders for more info.
   * @param  {string} category "input", "parse", "paginate" or "output"
   * @param  {Object} [config={}] An optional config that can override the config previously
   * loaded
   * @return {Object} processor
   */
  _buildProcessor(category, config = {}) {
    const categoryProcessors = this._processors[category];
    const categoryConfig = this._config[category] || {};
    const processorName = Object.keys(config)[0] || Object.keys(categoryConfig)[0];
    const Processor = categoryProcessors[processorName] || categoryProcessors.fallback;
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
