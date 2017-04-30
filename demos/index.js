#!/usr/bin/env node

const path = require('path');
const ora = require('ora');

const MixCloudStatsParser = require('./processors/parsers/mixcloud-stats-parser');
const Templater = require('./processors/transformers/templater');

const JasonTheMiner = require('..');

const jason = new JasonTheMiner();

jason.registerProcessor({ category: 'parse', name: 'mixcloud-stats', processor: MixCloudStatsParser });
jason.registerProcessor({ category: 'transform', name: 'tpl', processor: Templater });

jason.registerHelper({
  category: 'filter',
  name: 'remove-protocol',
  helper: text => text.replace(/^https?:/, '')
});

const demoFiles = [
  'imdb/imdb-serie.json',
  'imdb/imdb-top250.json',
  'github-search.json',
  'goodreads-search.json',
  'npm-starred.json',
  'spotify-search.json',
  // $ npm run demos:debug < demos/data/in/imdb-top250.html
  // 'imdb/imdb-top250.json',
  // 'mixcloud-stats.json',
  // $ curl http://rickandmorty.wikia.com/wiki/Category:Characters | npm run demos:debug
  // 'wikia-characters.json',
];

/* eslint-disable arrow-body-style, no-console */

console.log('Jason the Miner demos suite ⛏⛏⛏');

const spinner = ora({ spinner: 'dots4' });

const demoSequenceP = demoFiles.reduce((previousP, file) => {
  return previousP
    .then(() => {
      spinner.start().text = `Launching "${file}" demo...`;
      const demoPath = path.join(process.cwd(), 'demos/config', file);
      return jason.loadConfig(demoPath);
    })
    .then(() => jason.harvest())
    .then(() => spinner.succeed());
}, Promise.resolve());

demoSequenceP
  .then(() => {
    spinner.succeed();
    console.log('\nAll done! :D');
    console.log('Check the "demos/data/out" folder.');
  })
  .catch(error => {
    spinner.fail();
    console.error('Ooops! Something went wrong. :(');
    console.error(error);
  });
