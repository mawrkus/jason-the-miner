#!/usr/bin/env node

const path = require('path');
const ora = require('ora');

const Browser = require('./processors/loaders/Browser');
const Templater = require('./processors/transformers/Templater');
const EsBulkInserter = require('./processors/transformers/EsBulkInserter');
const isAppStoreLink = require('./processors/parsers/helpers/matchers/isAppStoreLink');

const JasonTheMiner = require('..');

const jason = new JasonTheMiner();

jason.registerProcessor({
  category: 'load',
  name: 'browser',
  processor: Browser,
});
jason.registerProcessor({
  category: 'transform',
  name: 'tpl',
  processor: Templater,
});
jason.registerProcessor({
  category: 'transform',
  name: 'es-bulk-inserter',
  processor: EsBulkInserter,
});
jason.registerHelper({
  category: 'match',
  name: 'isAppStoreLink',
  helper: isAppStoreLink,
});

const demos = [
  /* GitHub searches
  {
    name: 'GitHub search from file (json output)',
    file: 'file-html-json.json',
  },
  {
    name: 'GitHub search from file (csv output)',
    file: 'file-html-csv.json',
  },
  {
    name: 'GitHub search from file (md output)',
    file: 'file-html-tpl.json',
  },
  {
    name: 'GitHub bulk search (queries from csv file)',
    file: 'bulk-csv-http-html-paginate-json.json',
  },
  {
    name: 'GitHub bulk search (static pagination)',
    file: 'bulk-identity-file-html-csv.json',
  },
  {
    name: 'Extended GitHub search with issues',
    file: 'http-html-follow-x2-paginate-x2-json.json',
  },
  // Google search for apps
  {
    name: 'Google search for app stores links',
    file: 'http-html-follow-json.json',
  },
  // Goodreads search for books
  {
    name: 'CSV to JSON file conversion',
    file: 'file-csv-json.json',
  },
  {
    name: 'Goodreads books with Amazon ID',
    file: 'http-html-follow-follow-json-csv-stdout.json',
  },
  // Imdb images
  {
    name: 'Imdb images gallery links',
    file: 'http-html-follow-paginate-json.json',
  },
  {
    name: 'Avatars download',
    file: 'http-html-download.json',
  },
  /* Puppeteer browser */
  {
    name: 'PWA search',
    file: 'browser-html-json.json',
  },
  /* Elasticsearch bulk insertion */
  /* {
    name: 'Elasticsearch blog posts',
    file: 'csv-identity-es-bulk.json',
  }, */
  /* Misc */
  /* {
    name: 'Misc',
    file: 'file-html-stdout.json',
  },
  {
    name: 'Misc',
    file: 'http-html-email.json',
  },
  {
    name: 'Misc',
    file: 'http-html-email-from-parse.json',
  },
  {
    name: 'Misc',
    file: 'http-html-json.json',
  },
  {
    name: 'Misc',
    file: 'identity-html-stdout.json',
  }, */
];

/* eslint-disable no-console */

(async () => {
  const spinner = ora({ spinner: 'dots4' });

  /* eslint-disable no-await-in-loop */
  // eslint-disable-next-line no-restricted-syntax
  for (const demo of demos) {
    const { file, name } = demo;
    spinner.start().text = `Launching "${name}" demo (${file})...`;

    const demoPath = path.join('demos/configs', file);

    try {
      await jason.loadConfig(demoPath);
      await jason.harvest();
      spinner.succeed(`"${name}" demo finished (${file}).`);
    } catch (error) {
      spinner.fail('Ooops! Something went wrong. :(');
      console.error(error);
    }
  }

  spinner.start().stopAndPersist({
    symbol: '⛏ ',
    text: 'Have a look at the demos/data/out folder.',
  });
  /* eslint-enable no-await-in-loop */
})();
