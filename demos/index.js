#!/usr/bin/env node

const path = require('path');
const ora = require('ora');

const MixCloudStatsParser = require('./processors/parsers/MixCloudStatsParser');
const Templater = require('./processors/transformers/Templater');

const JasonTheMiner = require('..');

const jason = new JasonTheMiner();

jason.registerProcessor({ category: 'parse', name: 'mixcloud-stats', processor: MixCloudStatsParser });
jason.registerProcessor({ category: 'transform', name: 'tpl', processor: Templater });

jason.registerHelper({
  category: 'filter',
  name: 'remove-protocol',
  helper: text => text.replace(/^https?:/, ''),
});

const demoFiles = [
  // 'file-html-stdout.json',
  'file-html-json.json',
  'file-html-csv.json',
  'http-html-paginate-csv.json',
  'http-html-follow-x2-paginate-x2-json.json',
  'http-html-follow-paginate-json.json',
  // 'http-html-download.json',
  // 'http-html-email.json',
];

/* eslint-disable no-console */

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
