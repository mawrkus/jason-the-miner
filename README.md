# Jason the Miner


A modular Web scraper/harvester/data extractor.

## ⛏ Disclaimer

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

## ⛏ Features

- **Composable:** how to acquire data (and paginate), how to parse data, where to output data
- **Configurable:** how to acquire data (and paginate), how to parse data, where to output data
- **Modular:** pluggable processors (in, parse, out)
- **Promise-based:** ...

## ⛏ Installation

```shell
$ npm install -g jason-the-miner
```

## ⛏ TL;DR Usage Example

```shell
$ jason-the-miner -c my-config.json
```

```json
```

## ⛏ Recipes

- http > html > json
- http > html (2 schemas) > json-file
- http > html (2 schemas) > json-file (alternative: > out.json and debug 2> out.log)
- curl | stdin > html > stdout
- file > html > csv-file
- http+paglink > html > json
- http+pagparam > html > json
- http > html-custom > email
- http > html > tpl

```json
```

## ⛏ Config file

4 processors

```json
```

extractors and filters

[selector] << [extractor] | [filter]

## ⛏ CLI

```shell
Usage:
  jason-the-miner [OPTIONS] [ARGS]

Options:
  -c, --config           Configuration file, required
  -d, --debug            Prints debug information, 'jason:*' by default
  -h, --help             Display help and usage details
```

## ⛏ API

```js
registerProcessor({ category, name, processor })
registerHelper({ category, name, helper })
loadConfig(configFile)
harvest({ loadConfig, parseConfig, outputConfig, paginationConfig } = {})
```

## ⛏ References & related links

- Web Scraping With Node.js: https://www.smashingmagazine.com/2015/04/web-scraping-with-nodejs/
- X-ray, The next web scraper. See through the <html> noise: https://github.com/lapwinglabs/x-ray
- Node.js Scraping Libraries: http://blog.webkid.io/nodejs-scraping-libraries/

## ⛏ Roadmap

- Write examples:
follow link pagination -> depends on the markup, if next link = uri => set baseURL and url so that only url can be changed
- ESDoc
- Tests
- Check example: http://developer.telerik.com/featured/spying-on-james-bond-with-node-js/

## ⛏ License

Copyright (c) 2016 Marc Mignonsin <web@sparring-partner.be>

MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
