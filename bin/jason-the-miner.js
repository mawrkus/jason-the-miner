#!/usr/bin/env node

/* eslint-disable no-console, no-multi-spaces */

const path = require('path');
const program = require('commander');
const ora = require('ora');
const version = require('../package').version;

program
  .version(version)
  .option('-c, --config [file]',  'configuration file',                       String, '')
  .option('-d, --debug [name]',   'prints debug info ("jason:*" by default)', String)
  .parse(process.argv);

const { config, debug } = program;

if (!config) {
  console.error('Have you forgotten to specify a CSV keywords file? ;)');
  program.help();
}

if (debug) {
  process.env.DEBUG = debug === true ? 'jason:*' : debug;
}

const JasonTheMiner = require('..'); // must be AFTER setting the DEBUG environment variable

const jason = new JasonTheMiner();
const spinner = ora({ text: 'Harvesting...', spinner: 'dots4' }).start();

jason
.loadConfig(path.join(process.cwd(), config))
.then(() => jason.harvest())
.then(() => spinner.succeed())
.catch(error => {
  spinner.fail();
  console.error('Ooops! Something went wrong. :(');
  console.error(error);
});
