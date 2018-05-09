const path = require('path');
const puppeteer = require('puppeteer');
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
  constructor({ config }) {
    this._config = {
      ...config,
    };

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
  // eslint-disable-next-line class-methods-use-this
  async run({ options } = {}) {
    const runConfig = { ...this._config, ...options };
    const {
      launch,
      goto,
      screenshot,
      pdf,
    } = runConfig;
    const { url, options: gotoOptions } = goto;

    debug('Starting browser...');
    debug(launch);
    const browser = await puppeteer.launch(launch);

    debug('Opening new page...');
    const page = await browser.newPage();

    debug('Navigating to "%s"...', url);
    debug(gotoOptions);
    await page.goto(url, gotoOptions);

    if (screenshot) {
      const screenshotFolder = path.dirname(screenshot.path);
      debug('Creating screenshot folder "%s"...', screenshotFolder);
      await makeDir(screenshotFolder);

      debug('Saving screenshot to "%s"...', screenshot.path);
      debug(screenshot);
      await page.screenshot(screenshot);
    }

    if (pdf) {
      const pdfFolder = path.dirname(pdf.path);
      debug('Creating pdf folder "%s"...', pdfFolder);
      await makeDir(pdfFolder);

      debug('Saving pdf to "%s"...', pdf.path);
      debug(pdf);
      await page.pdf(pdf);
    }

    debug('Fetching content...');
    const html = await page.content();

    debug('Closing browser...');
    await browser.close();

    debug('%d byte(s) of HTML read.', html ? html.length : 0);

    return html;
  }
}

module.exports = Browser;
