const Jasmine = require('jasmine');
const SpecReporter = require('jasmine-spec-reporter');

const jasmine = new Jasmine();

jasmine.loadConfig({
  'spec_dir': 'tests',
  'spec_files': [
    '**/*.spec.js'
  ]
});

const specReporter = new SpecReporter({
  displayStacktrace: 'all',
  displayFailuresSummary: false,
  displayPendingSummary: false,
  displayPendingSpec: true
});

jasmine.addReporter(specReporter);

jasmine.execute();
