#!/usr/bin/env node

const path = require('path');
const ora = require('ora');

const Templater = require('./processors/transformers/Templater');
const isAppStoreLink = require('./processors/parsers/helpers/matchers/isAppStoreLink');

const JasonTheMiner = require('..');

const jason = new JasonTheMiner();

jason.registerProcessor({ category: 'transform', name: 'tpl', processor: Templater });
jason.registerHelper({ category: 'match', name: 'isAppStoreLink', helper: isAppStoreLink });

/* eslint-disable no-console */

const demoFiles = [
  /* GitHub searches */
  'file-html-json.json',
  'file-html-csv.json',
  'file-html-tpl.json',
  'file-paginate-html-csv.json',
  'http-paginate-html-csv.json',
  'http-html-follow-x2-paginate-x2-json.json',
  /* Google search for apps */
  'http-html-follow-json.json',
  /* Goodreads search for books */
  'http-html-follow-follow-json-csv-stdout.json',
  /* Imdb images */
  'http-html-follow-paginate-json.json',
  'http-html-download.json',
  /* Misc */
  // 'file-html-stdout.json',
  // 'http-html-email.json',
  // 'http-html-email-from-parse.json',
  // 'http-html-json.json',
  // 'identity-html-stdout.json',
];

(async () => {
  console.log('Jason the Miner demos suite ⛏⛏⛏');

  const spinner = ora({ spinner: 'dots4' });

  // eslint-disable-next-line no-restricted-syntax
  for (const file of demoFiles) {
    spinner.start().text = `Launching "${file}" demo...`;

    const demoPath = path.join('demos/configs', file);

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
