#!/usr/bin/env node

/* eslint-disable no-console */

'use strict';

const cli = require('cli');
const fs = require('fs');
const JasonTheMiner = require('..');

cli.parse({
  'config': ['c', 'Config file', 'string'],
  'baseUrl': ['u', 'Base URL (optional)', 'string', ''],
  'title': ['t', 'Title (optional)', 'string', ''],
  'searchTerm': ['s', 'Search term (optional)', 'string', ''],
  'outputFile': ['o', 'Output file (optional)', 'string', ''],
  'verbose': ['v', 'Verbose', 'boolean', false]
});

cli.main((args, options) => {
  if (options.config) {
    const configFile = options.config;
    let settings;

    try {
      settings = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    } catch (err) {
      console.error('Ooops! Unable to load config file %s!', configFile);
      console.error(err);
      process.exit(1);
    }

    ['baseUrl', 'title', 'outputFile', 'verbose'].forEach(name => {
      if (options[name]) {
        settings[name] = options[name];
      }
    });

    const scraper = new JasonTheMiner(settings);
    const searchTerm = options.searchTerm;
    const promise = searchTerm ? scraper.searchAndScrape(searchTerm) : scraper.scrape();

    promise
      .then(result => {
        if (!settings.outputFile) {
          process.stdout.write(JSON.stringify(result) + '\n');
        }
      })
      .catch(err => {
        console.info('Ooops! Something went wrong...');
        console.error(err.stack);
        console.info('Cannot complete scraping. Sorry :(');
        process.exit(1);
      });
  } else {
    cli.getUsage();
  }
});

/* eslint-enable no-console */
