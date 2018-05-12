const path = require('path');
const puppeteer = require('puppeteer');
const get = require('lodash.get');
const makeDir = require('make-dir');
const debug = require('debug')('jason:load:browser');

/**
 * A browser. Depends on the "puppeteer" package.
 @see https://github.com/GoogleChrome/puppeteer
 */
class Browser {
  /**
   * @param {Object} config The config object
   * @param {Object} config.launch Puppeteer "launch" options
   * @param {Object} config.goto Page "goto" options
   * @param {Object} config.screenshot Page "screenshot" options
   */
  constructor({ config = {} }) {
    this._config = {
      ...config,
    };

    this._browser = null;

    debug('Browser instance created.');
    debug('config', this._config);
  }

  /**
   * Returns the config. Used for limiting the concurrency when following/paginating.
   * @return {Object}
   */
  getConfig() {
    return this._config;
  }

  /**
   * Builds new load options.
   * @param {string} link
   * @return {Object}
   */
  // eslint-disable-next-line class-methods-use-this
  buildLoadOptions({ link }) {
    const options = { url: link };
    return options;
  }

  /**
   * @param {Object} [options] Optional read options.
   * @return {Promise}
   */
  async run({ options } = {}) {
    const runConfig = { ...this._config, ...options };
    const {
      launch,
      goto,
      actions,
      evaluate,
    } = runConfig;

    debug('Starting browser...');
    debug(launch);
    this._browser = await puppeteer.launch(launch);

    let result;

    try {
      debug('Opening new page...');
      const page = await this._browser.newPage();

      debug('Navigating to "%s"...', goto.url);
      debug(goto.options);
      await page.goto(goto.url, goto.options);

      if (actions) {
        debug('%d page action(s) to execute.', actions.length);
        await this._executePageActions({ page, actions });
      }

      if (evaluate) {
        debug('Evaluating function...');
        debug(evaluate);
        result = await page.evaluate(evaluate);
      } else {
        debug('Fetching HTML...');
        result = await page.content();
        debug('%d byte(s) of HTML read.', result ? result.length : 0);
      }
    } catch (error) {
      debug('Error loading page: %s!', error.message);
      this._browser.close();
      throw error;
    }

    debug('Closing browser...');
    await this._browser.close();

    return result;
  }

  /**
   * @param  {BrowserPage} page
   * @param  {Object[]} actions
   * @return {Promise}
   */
  // eslint-disable-next-line class-methods-use-this
  async _executePageActions({ page, actions }) {
    /* eslint-disable no-restricted-syntax, no-await-in-loop */
    for (const action of actions) {
      const actionPath = Object.keys(action)[0];
      const actionParams = action[actionPath];
      const pageMethod = get(page, actionPath);

      if (typeof pageMethod === 'function') {
        debug('Executing "%s" page action...', actionPath);
        debug(actionParams);

        if (actionParams.path) {
          const folder = path.dirname(actionParams.path);
          debug('Creating folder "%s"...', folder);
          await makeDir(folder);
        }

        const actionPathParts = actionPath.split('.');
        const methodObject = actionPathParts.length > 1 ? page[actionPathParts[0]] : page;

        await pageMethod.apply(methodObject, actionParams);
      } else {
        debug('Unknown "%s" page action, skipping.', action);
      }
    }
  }
}

module.exports = Browser;
