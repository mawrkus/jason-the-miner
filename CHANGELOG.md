# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.1.0] - 2020-06-01

### Added

- Support for multiple transformers
- Identity processor: allow static data definition in its config
- New "csv-file" loader
- New "csv" parser
- New HTML parse filter: "json-parse" (useful for parsing json-ld)
- New HTML parse extractor: "count" -> counts the number of elements matching the selector (requires an array schema definition)
- New Bulk processor
- New demos (incl. new "browser" loader based on Puppeteer https://github.com/GoogleChrome/puppeteer/)
- New "nameSelector" option for the file downloader processor

### Removed

- Loaders: pagination templates (in `path` or `url`) have been removed in favor of the "bulk" processor config

### Changed

- HTML parser: follow and paginate links have full support of matchers, extractors and filters
- HTTP loader: cache options are prefixed by an underscore for the sake of consistency
- HTML parser: paginate options are prefixed by an underscore for the sake of consistency
- CSV transformer: options are split between "csv" and other file-related options
- E-mail transformer: options are split between "smtp" and "message"
- All processors now received their configuration object within an object: { config }
- CSV and JSON file writers try to create the output folder if it does not exist, before saving the file
- The file downloader processor tries also to create the output folder if it does not exist
- Upgraded dependencies

## [1.0.1] - 2018-04-13

### Fixed

- Fixed missing methods in the "stdin", "identity" and "noop" processors

## [1.0.0] - 2018-04-13

### Added

- Better schema capabilities: full support for following & paginating at any level
- New parse helpers: DOM elements matchers
- New parse helpers: date, uuid and static text extractors
- HTTP file system cache
- Pagination template support for the "http" loader `url` option
- Pagination template support for the "file" loader `path` option

### Removed

- Removed the JSON parser

### Changed

- Updated the demos
