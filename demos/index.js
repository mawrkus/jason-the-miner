#!/usr/bin/env node

const path = require('path');
const url = require('url');
const ora = require('ora');

const MixCloudStatsParser = require('./processors/parsers/MixCloudStatsParser');
const Templater = require('./processors/transformers/Templater');

const JasonTheMiner = require('..');

const jason = new JasonTheMiner();

jason.registerProcessor({ category: 'parse', name: 'mixcloud-stats', processor: MixCloudStatsParser });
jason.registerProcessor({ category: 'transform', name: 'tpl', processor: Templater });

const appStores = {
  'play.google.com': {
    appPathRegex: /\/store\/apps\/details/,
  },
  'itunes.apple.com': {
    appPathRegex: /.+\/app(\/.+)?\/id([0-9]+)/,
  },
};

jason.registerHelper({
  category: 'match',
  name: 'isAppStoreLink',
  helper: ($el) => {
    const href = ($el.attr('href') || '').trim();

    if (!href || href === '#') {
      return false;
    }

    const { host, pathname } = url.parse(href);
    if (!host || !pathname) {
      return false;
    }

    const supportedHost = appStores[host];
    if (!supportedHost) {
      return false;
    }

    return !!pathname.match(supportedHost.appPathRegex);
  },
});


/* eslint-disable no-console */

const demoFiles = [
  /* GitHub searches */
  'file-html-json.json',
  'file-html-csv.json',
  'file-html-tpl.json',
  'http-html-paginate-csv.json',
  'http-html-follow-x2-paginate-x2-json.json',
  /* Google search for apps */
  'http-html-follow-json.json',
  /* Imdb images */
  'http-html-follow-paginate-json.json',
];

/* const miscDemoFiles = [
  'file-html-stdout.json',
  'http-html-download.json',
  'http-html-email.json',
  'http-html-json.json',
]; */

(async () => {
  console.log('Jason the Miner demos suite ⛏⛏⛏');

  const spinner = ora({ spinner: 'dots4' });

  // eslint-disable-next-line no-restricted-syntax
  for (const file of demoFiles) {
    spinner.start().text = `Launching "${file}" demo...`;

    const demoPath = path.join(process.cwd(), 'demos/configs', file);

    try {
      await jason.loadConfig(demoPath); // eslint-disable-line no-await-in-loop
      await jason.harvest(); // eslint-disable-line no-await-in-loop
      spinner.succeed();
    } catch (error) {
      console.error('Ooops! Something went wrong. :(');
      console.error(error);
      spinner.fail();
    }
  }
})();
