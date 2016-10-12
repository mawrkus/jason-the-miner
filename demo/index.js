#!/usr/bin/env node

const path = require('path');
const ora = require('ora');

const JasonTheMiner = require('..');
const MixCloudStatsParser = require('./processors/parse/mixcloud-stats-parser');
const Emailer = require('./processors/output/emailer');
const Templater = require('./processors/output/templater');

const jason = new JasonTheMiner();

jason.registerProcessor({ category: 'parse', name: 'mixcloud-stats', processor: MixCloudStatsParser });
jason.registerProcessor({ category: 'output', name: 'email', processor: Emailer });
jason.registerProcessor({ category: 'output', name: 'tpl', processor: Templater });

jason.registerHelper({
  category: 'filters',
  name: 'remove-protocol',
  helper: text => text.replace(/^https?:/, '')
});

const demoFiles = [
  'goodreads-http.json',
  'imdb-file.json',
  'imdb-http-paginate.json',
  'npm-tpl.json',
  // 'mixcloud-email.json',
  // $ curl http://rickandmorty.wikia.com/wiki/Category:Characters | npm run demo:debug
  // 'wikia-stdin.json',
  // $ npm run debug < demo/data/in/IMDbTop250.html
  // 'imdb-file-stdin.json',
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
  .then(() => {
    const file = 'demo/config/npm-tpl.json';
    spinner.start().text = `Launching "${file}" demo...`;
    const demoPath = path.join(process.cwd(), file);
    return jason.loadConfig(demoPath);
  })
  .then(() => {
    const outputConfig = {
      "tpl": {
        "templatePath": "demo/data/in/npm-starred.md.tpl",
        "outputPath": "demo/data/out/npm-starred.md"
      }
    };
    return jason.harvest({ outputConfig });
  })
  .then(() => {
    spinner.succeed();
    console.log('\nAll done! :D');
  })
  .catch(error => {
    spinner.fail();
    console.error('Ooops! Something went wrong. :(');
    console.error(error);
  });
