# Jason The Miner

A Web scraper/harvester/data extractor.

## Disclaimer

Please take these guidelines in consideration when scraping:

- Content being scraped is not copyright protected.
- The act of scraping does not burden the services of the site being scraped.
- The scraper does not violate the Terms of Use of the site being scraped.
- The scraper does not gather sensitive user information.
- The scraped content adheres to fair use standards.

In brief, use it wisely.

More info:

- https://www.scrapesentry.com/scraping-wiki/web-scraping-legal-or-illegal/
- http://blog.icreon.us/web-scraping-and-you-a-legal-primer-for-one-of-its-most-useful-tools/

## Install

```bash
npm install -g jason-the-miner
```

## Usage

Jason The Miner uses a configuration file and/or command line arguments to produce a JSON file containing the scraped data.

```bash
jason-the-miner -c [config file] -u [base URL] -t [results title] -s [search term] -o [output file] -v

-c config file: required
-u base URL: optional
-t results title: optional
-s search term: optional
-o output file: optional
-v verbose
-h help
```

### Config examples

See the "demos" folder.

### CLI examples

```bash
jason-the-miner -c demos/a.config.json -s love -o demos/results/a-love.results.json
jason-the-miner -c demos/c.config.json -s wormhole -o demos/results/c-wormhole.results.json
jason-the-miner -c demos/d.config.json -u http://www.xxx.com/yyy/zzz -t "Some other episodes" -o demos/results/d.results.json
```

## History

This project started as a prototype and evolved to a slightly more complex program.

## Todo

1. Tests! Shame shame shame...
2. Babel => full usage of ES2015
3. Templating? JSON output => CSV/XML/HTML/Anything
4. Comments classes/objects methods
5. ...
