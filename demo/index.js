#!/usr/bin/env node

const path = require('path');

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
  // path.join(process.cwd(), 'demo/config/goodreads-http.json'),
  // path.join(process.cwd(), 'demo/config/imdb-file.json'),
  // path.join(process.cwd(), 'demo/config/imdb-http-paginate.json'),
  // path.join(process.cwd(), 'demo/config/mixcloud-email.json'),
  // path.join(process.cwd(), 'demo/config/npm-tpl.json'),
  // curl http://rickandmorty.wikia.com/wiki/Category:Characters | npm run demo:debug
  // OR cat demo/data/in/RickAndMorty@Wikia.html | npm run demo:debug
  path.join(process.cwd(), 'demo/config/wikia-stdin.json')
];

/* eslint-disable */

const demoSequenceP = demoFiles.reduce((previousP, file) => {
  return previousP.then(() => jason.loadConfig(file).then(() => jason.harvest()));
}, Promise.resolve());

demoSequenceP
  .then(() => console.log('\nAll done! :D'))
  .catch(error => {
    console.error('Ooops! Something went wrong. :(');
    console.error(error);
  });
