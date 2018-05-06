#!/usr/bin/env node

/* eslint-disable no-console */

const path = require('path');
const program = require('commander');
const ora = require('ora');
const { version } = require('../package');

program
  .version(version)
  .option('-c, --config [file]', 'configuration file, required', String, '')
  .option('-d, --debug [name]', 'prints debug info ("jason:*" by default)', String)
  .parse(process.argv);

const { config, debug } = program;

if (!config) {
  console.error('Have you forgotten to specify a config file? ;)');
  program.help();
}

if (debug) {
  process.env.DEBUG = debug === true ? 'jason:*' : debug;
}

const JasonTheMiner = require('..'); // must be AFTER setting the DEBUG environment variable

const jason = new JasonTheMiner({
  fallbacks: {
    load: 'stdin',
    parse: 'html',
    transform: 'stdout',
  },
});

const configPath = path.join(config);

const spinner = ora({ spinner: 'dots4' }).start('⛏  Harvesting...');

jason
  .loadConfig(configPath)
  .then(() => jason.harvest())
  .then(() => spinner.succeed('All good! :D'))
  .catch((error) => {
    spinner.fail('Ooops! Something went wrong. :(');
    console.error(error);
  });
