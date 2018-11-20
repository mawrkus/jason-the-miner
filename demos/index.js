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
  /* Elasticsearch
  {
    name: 'Elasticsearch blog posts bulk import to http://localhost:9200',
    file: 'elasticsearch/csv-identity-es-bulk.json',
  }, */
  /* Github */
  {
    name: 'GitHub bulk search (queries from csv file)',
    file: 'github/bulk-csv-http-html-paginate-json.json',
  },
  {
    name: 'GitHub bulk search (static pagination)',
    file: 'github/bulk-identity-file-html-csv.json',
  },
  {
    name: 'Extended GitHub search with issues',
    file: 'github/http-html-follow-x2-paginate-x2-json.json',
  },
  {
    name: 'Simple GitHub search',
    file: 'github/http-html-json.json',
  },
  /* Goodreads */
  {
    name: 'Goodreads search for books and download covers',
    file: 'goodreads/http-html-csv-download',
  },
  {
    name: 'Goodreads search for books and product ID on Amazon',
    file: 'goodreads/http-html-follow-follow-json-csv-stdout.json',
  },
  /* Google */
  {
    name: 'Google search for app stores links',
    file: 'google/http-html-follow-json.json',
  },
  /* IMDb */
  {
    name: 'IMdb images gallery links',
    file: 'imdb/http-html-follow-paginate-json.json',
  },
  /* Misc */
  {
    name: 'Misc: parse csv file -> json',
    file: 'misc/file-csv-json.json',
  },
  {
    name: 'Misc: parse html file -> json',
    file: 'misc/file-html-json.json',
  },
  {
    name: 'Misc: parse html file -> stdout',
    file: 'misc/file-html-stdout.json',
  },
  {
    name: 'Misc: parse html file -> markdown (via templating)',
    file: 'misc/file-html-tpl.json',
  },
  {
    name: 'Misc: parse static html -> stdout',
    file: 'misc/identity-html-stdout.json',
  },
  // {
  //    name: 'Misc',
  //    file: 'misc/sdin-html-stdout.json',
  // },
  /* Mixcloud
  {
    name: 'Email stats from mixcloud.com (1)',
    file: 'mixcloud/http-html-email-from-parse.json',
  },
  {
    name: 'Email stats from mixcloud.com (2)',
    file: 'mixcloud/http-html-email.json',
  }, */
  /* Outweb */
  {
    name: 'Search outweb.io for PWAs',
    file: 'outweb/browser-html-json.json',
  },
  /* UI faces */
  {
    name: 'Download avatars from uifaces.co',
    file: 'uifaces/http-html-download.json',
  },
];

/* eslint-disable no-console */

(async () => {
  const spinner = ora({ spinner: 'dots4' });

  demos.reduce(async (p, demo) => {
    await p;

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
  }, Promise.resolve());

  spinner.start().stopAndPersist({
    symbol: '⛏ ',
    text: 'Have a look at the demos/data/out folder.',
  });
  /* eslint-enable no-await-in-loop */
})();
