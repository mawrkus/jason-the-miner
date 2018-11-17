const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const get = require('lodash.get');
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
  constructor({ config = {} } = {}) {
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
   * @param {Object} [options] Optional options.
   * @return {Promise}
   */
  async run({ options } = {}) {
    const runConfig = { ...this._config, ...options };
    const { launch } = runConfig;

    debug('Starting browser...');
    debug(launch);
    this._browser = await puppeteer.launch(launch);

    const result = await this._runPage(runConfig);

    debug('Closing browser...');
    await this._browser.close();

    return result;
  }

  /**
   * @param {Object} [options] Optional read options.
   * @return {Promise}
   */
  async _runPage(runConfig) {
    const {
      emulate,
      goto,
      actions,
    } = runConfig;

    let result;

    try {
      debug('Opening new page...');
      const page = await this._browser.newPage();

      if (emulate) {
        debug('Emulating "%s" device.', emulate);
        await page.emulate(devices[emulate]);
      }

      debug('Navigating to "%s"...', goto.url);
      debug(goto.options);
      await page.goto(goto.url, goto.options);

      if (actions) {
        debug('%d page action(s) to execute.', actions.length);
        result = await this._executePageActions({ page, actions });
        debug('All %d page action(s) executed, returning last result.', actions.length);
      } else {
        debug('Default action: fetching HTML...');
        result = await page.content();
        debug('%d byte(s) of HTML read.', result ? result.length : 0);
      }
    } catch (error) {
      debug('Error loading page: %s!', error.message);
      debug('Closing browser...');
      await this._browser.close();
      throw error;
    }

    return result;
  }

  /**
   * @param  {BrowserPage} page
   * @param  {Object[]} actions
   * @return {Promise}
   */
  // eslint-disable-next-line class-methods-use-this
  async _executePageActions({ page, actions }) {
    let result;

    /* eslint-disable no-restricted-syntax, no-await-in-loop */
    for (const action of actions) {
      const actionPath = Object.keys(action)[0];
      const actionParams = action[actionPath] || [];
      const pageMethod = get(page, actionPath);

      if (typeof pageMethod === 'function') {
        debug('Executing "%s"...', actionPath);
        debug(actionParams);

        const actionPathParts = actionPath.split('.');
        const methodObject = actionPathParts.length > 1 ? page[actionPathParts[0]] : page;

        result = await pageMethod.apply(methodObject, actionParams);
        debug(result);
      } else {
        debug('Unknown action "%s" (function expected), skipping.', actionPath, action);
      }
    }

    return result;
  }
}

module.exports = Browser;
