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
      const results = await this._loadAndParse({ loader, parser });
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
  async _loadAndParse({ loader, parser }) {
    const follows = loader.buildPaginationLinks().map(link => ({ link }));
    const { concurrency = 1 } = loader.getConfig();

    debug('Paginating %d link(s) at max concurrency=%d...', follows.length, concurrency);

    const followResults = await Bluebird.map(
      follows,
      ({ link }) => this._followLink({
        link,
        loader,
        concurrency,
        parser,
      }),
      { concurrency },
    );

    debug('Finished pagination.');
    debug(followResults);

    const results = followResults.reduce((acc, newResult) => {
      this._mergeResults({ to: acc, newResult });
      return acc;
    }, {});

    return results;
  }

  /**
   * @param  {string} link
   * @param  {Loader} loader
   * @param  {number} concurrency
   * @param  {Parser} parser
   * @param  {Object} [schema]
   * @param  {number} [level=0]
   * @return {Promise}
   */
  async _followLink({
    link,
    loader,
    concurrency,
    parser,
    schema,
    level = 0,
  }) {
    debug('Following "%s"...', link);
    try {
      const options = loader.buildLoadOptions({ link });
      const loadResult = await loader.run({ options });
      const parserResult = await parser.run({ data: loadResult, schema });
      const { result } = parserResult;

      const follows = this._getNextFollows({ parserResult, level });
      if (!follows.length) {
        debug('No (more) links to follow.');
        return result;
      }

      await Bluebird.map(
        follows,
        (async ({
          followLink,
          followSchema,
          followParsedPath,
          isPaginate,
        }) => {
          const newResult = await this._followLink({
            link: followLink,
            loader,
            concurrency,
            parser,
            schema: followSchema,
            level: isPaginate ? level + 1 : level,
          });

          const partialResult = !followParsedPath.length ?
            result :
            get(result, followParsedPath);

          this._mergeResults({ to: partialResult, newResult });
        }),
        { concurrency },
      );

      return result;
    } catch (error) {
      debug(error);
      return { _errors: [this._formatError(error)] };
    }
  }

  /**
   * @param {Object} parserResult
   * @param {number} level
   * @return {Array}
   */
  // eslint-disable-next-line class-methods-use-this
  _getNextFollows({ parserResult, level }) {
    const { schema, follow, paginate } = parserResult;

    const allowedPaginates = paginate
      .filter(({ depth }) => level < depth)
      .map(p => ({ ...p, isPaginate: true }));

    debug('Found %d link(s) and %d page(s) to follow.', follow.length, allowedPaginates.length);

    const nextFollows = follow.concat(allowedPaginates)
      .map(({
        link: followLink,
        schemaPath,
        parsedPath: followParsedPath,
        isPaginate,
      }) => ({
        followLink,
        followSchema: !schemaPath.length ? schema : get(schema, schemaPath),
        followParsedPath,
        isPaginate: !!isPaginate,
      }));

    debug(nextFollows);

    return nextFollows;
  }

  /**
   * @param {Object} to
   * @param {Array} nextResults
   */
  // eslint-disable-next-line class-methods-use-this
  _mergeResults({ to, newResult }) {
    debug('Merging...');
    debug(newResult);
    debug('to ------>');
    debug(to);
    debug('=======');

    // eslint-disable-next-line consistent-return
    const mergedResult = mergeWith(to, newResult, (obj, src) => {
      if (Array.isArray(obj)) {
        return obj.concat(src);
      }
    });

    debug('merged result');
    debug(mergedResult);
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

    // readable output in all cases
    if (!error.msg) {
      error.msg = error.toString(); // eslint-disable-line no-param-reassign
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
