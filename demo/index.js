#!/usr/bin/env node

const path = require('path');
const ora = require('ora');

const MixCloudStatsParser = require('./processors/parsers/mixcloud-stats-parser');
const Emailer = require('./processors/transformers/emailer');
const Templater = require('./processors/transformers/templater');

const JasonTheMiner = require('..');

const jason = new JasonTheMiner();

jason.registerProcessor({ category: 'parse', name: 'mixcloud-stats', processor: MixCloudStatsParser });
jason.registerProcessor({ category: 'transform', name: 'email', processor: Emailer });
jason.registerProcessor({ category: 'transform', name: 'tpl', processor: Templater });

jason.registerHelper({
  category: 'filter',
  name: 'remove-protocol',
  helper: text => text.replace(/^https?:/, '')
});

const demoFiles = [
  // 'github-search.json',
  // 'goodreads-search.json',
  'imdb/imdb-serie.json',
  // 'imdb/imdb-top250.json',
  // $ npm run demo:debug < demo/data/in/imdb-top250.html
  // 'imdb/imdb-top250-file.json',
  // 'mixcloud-stats.json',
  // 'npm-starred.json',
  // 'spotify-search.json',
  // $ curl http://rickandmorty.wikia.com/wiki/Category:Characters | npm run demo:debug
  // 'wikia-characters.json',
];

/* eslint-disable arrow-body-style, no-console */

console.log('Jason the Miner demo suite ⛏⛏⛏');

const spinner = ora({ spinner: 'dots4' });

const demoSequenceP = demoFiles.reduce((previousP, file) => {
  return previousP
    .then(() => {
      spinner.start().text = `Launching "${file}" demo...`;
      const demoPath = path.join(process.cwd(), 'demo/config', file);
      return jason.loadConfig(demoPath);
    })
    .then(() => jason.harvest())
    .then(() => spinner.succeed());
}, Promise.resolve());

demoSequenceP
  .then((a) => {
    spinner.succeed();
    console.log('\nAll done! :D', a);
  })
  .catch(error => {
    spinner.fail();
    console.error('Ooops! Something went wrong. :(');
    console.error(error);
  });
