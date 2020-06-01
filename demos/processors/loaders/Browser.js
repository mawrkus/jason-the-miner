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
    const { actions } = runConfig;

    let result;

    const page = await this._browser.newPage();
    this._logPageInfo(page, 'New page created!');

    try {
      if (actions) {
        const actionsCount = actions.length;
        const actionNames = actions.map(action => Object.keys(action)[0]);

        this._logPageInfo(page, `${actionsCount} action(s) to execute:`, actionNames);
        result = await this._executePageActions({ page, actions });
        this._logPageInfo(page, `Done: ${actionsCount} action(s) executed.`);
      } else {
        this._logPageInfo(page, 'Default action: fetching HTML...');
        result = await page.content();
        this._logPageInfo(page, `Done: ${result ? result.length : 0} byte(s) of HTML read.`);
      }
    } catch (error) {
      this._logPageInfo(page, `Unexpected browser error: ${error.message}!`);
      this._logPageInfo(page, 'Closing browser...');
      await this._browser.close();
      throw error;
    }

    debug(result);

    return result;
  }

  /**
   * @param  {Browser.Page} page
   * @param  {Object[]} actions
   * @return {Promise}
   */
  async _executePageActions({ page, actions }) {
    const actionsCount = actions.length;

    const result = actions.reduce(async (p, action, index) => {
      await p;

      let parsed;

      try {
        parsed = this._parsePageAction({ page, action });
      } catch (parseError) {
        this._logPageInfo(page, parseError, action);
        return Promise.resolve();
      }

      const {
        actionPath,
        actionParams,
        pageMethod,
        methodObject,
      } = parsed;

      this._logPageInfo(page, `${index + 1}/${actionsCount} -> "${actionPath}"`, actionParams);

      return pageMethod.apply(methodObject, actionParams);
    }, Promise.resolve());

    return result;
  }

  /**
   * @param  {Browser.Page} page
   * @param {Object} action
   * @return {Object}
   */
  // eslint-disable-next-line class-methods-use-this
  _parsePageAction({ page, action }) {
    const actionPath = Object.keys(action)[0];
    const actionParams = action[actionPath] || [];
    const pageMethod = get(page, actionPath);

    if (typeof pageMethod !== 'function') {
      const msg = `Unknown action "${actionPath}" (function expected)! Skipping.`;
      throw new Error(msg);
    }

    if (actionPath === 'emulate' && typeof actionParams[0] === 'string') {
      const deviceName = actionParams[0];
      const device = devices[deviceName];

      if (!device) {
        const msg = `Unknown device name "${deviceName}"! Skipping "emulate" action.`;
        throw new Error(msg);
      }

      actionParams[0] = device;
    }

    const actionPathParts = actionPath.split('.');
    const methodObject = actionPathParts.length > 1 ? page[actionPathParts[0]] : page;

    return {
      actionPath,
      actionParams,
      pageMethod,
      methodObject,
    };
  }

  /**
   * @param {Browser.Page} page
   * @param  {...any} args
   */
  // eslint-disable-next-line class-methods-use-this
  _logPageInfo(page, ...args) {
    const pageId = page.mainFrame()._id;
    debug(`[${pageId}]`, ...args);
  }
}

module.exports = Browser;
