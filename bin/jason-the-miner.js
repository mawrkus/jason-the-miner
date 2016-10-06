#!/usr/bin/env node

/* eslint-disable no-console, global-require */

const path = require('path');
const cli = require('cli');

cli.parse({
  'config': ['c', 'Configuration file'],
  'debug': ['d', 'Prints debug information ("jason:*" by default)']
});

cli.main(([config, debug], options) => {
  if (!options.config) {
    console.error('Have you forgotten to specify a configuration file? ;)\n');
    cli.getUsage();
  }

  if (options.debug) {
    process.env.DEBUG = debug || 'jason:*';
  }

  const JasonTheMiner = require('..'); // must be AFTER setting the DEBUG environment variable

  const jason = new JasonTheMiner();

  jason
    .loadConfig(path.join(process.cwd(), config))
    .then(() => jason.harvest())
    .catch(error => {
      console.error('Ooops! Something went wrong. :(');
      console.error(error);
    });
});
