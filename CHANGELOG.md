# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.1.0] - 2018-05-xxx

### Added

- Support for an array of transformers
- New demos

### Changed

- HTML parser: pagination options are prefixed by an underscore for the sake of consistency
- CSV transformer: Jason-specific options are prefixed by an underscore for the sake of consistency
- E-mail transformer: options are split between "smtp" and "message"

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
