const debug = require('debug')('jason:core');

const defaultProcessors = require('./processors');
const defaultParseHelpers = require('./processors/parse/helpers');

class JasonTheMiner {

  constructor({ processors, helpers } = {}) {
    this._processors = Object.assign({}, defaultProcessors, processors);
    this._helpers = Object.assign({}, defaultParseHelpers, helpers);
    this._config = {};

    debug('A new miner is born, and his name is Jason!');
    debug('processors', this._processors);
    debug('parse helpers', this._helpers);
  }

  registerProcessor({ category, name, processor }) {
    const processors = this._processors[category];
    processors[name] = processor;
    debug('New "%s" processor registered: "%s"', category, name);
  }

  registerHelper({ category, name, helper }) {
    this._helpers[category][name] = helper;
    debug('New "%s" helper registered: "%s"', category, name);
  }

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

  harvest({ loadConfig, parseConfig, outputConfig, paginationConfig } = {}) {
    debug('Harvesting...');
    const loader = this._buildProcessor('input', loadConfig);
    const parser = this._buildProcessor('parse', parseConfig);
    const writer = this._buildProcessor('output', outputConfig);
    const paginator = this._buildProcessor('paginate', paginationConfig);

    return this._paginate(loader, parser, paginator).then(results => writer.run(results));
  }

  _paginate(loader, parser, paginator, loadConfig = {}) {
    return loader.run(loadConfig)
      .then(input => parser.run(input))
      .then(results => {
        debug('Paginating..?');
        const nextLoadConfig = paginator.run(loader, parser);
        if (!nextLoadConfig) {
          return Promise.resolve(results);
        }

        return this._paginate(loader, parser, paginator, nextLoadConfig)
          .then(newResults => results.concat(newResults));
      });
  }

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
