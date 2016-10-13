# Jason the Miner [![npm](https://img.shields.io/npm/l/jason-the-miner.svg)](https://www.npmjs.org/package/jason-the-miner) [![npm](https://img.shields.io/npm/v/jason-the-miner.svg)](https://www.npmjs.org/package/jason-the-miner)

A modular Web scraper.

## ⛏ Features

- **Modular**, via a simple architecture based on pluggable processors. The output of one processor feeds the input of the next one. There are 4 types of processors in the chain:
  1. *input processors*, to acquire the (HTML) data (via HTTP requests, ...)
  2. *parse processors*, to parse the data acquired & to extract the relevant parts according to a predefined schema
  3. *output processors*: to write the results (to a file, via email, ...)
  4. *paginate processors*: optional, to establish a strategy when scraping multiple pages (follow the "next" link, ...)
- **Configurable**, each processor can be chosen & configured independently via a simple config file.
- **Extensible**, new processors can be registered.
- **CLI-friendly**, works well with *stdin* & *stdout*.
- **Promise-based**.

## ⛏ Installation

```shell
$ npm install -g jason-the-miner
```

## ⛏ TL;DR Usage Example

To scrape all the repos from my GitHub page:

- a. Create the *github.json* config file:

```json
{
  "input": {
    "http": {
      "url": "https://github.com/mawrkus"
    }
  },
  "parse": {
    "html": {
      "schemas": [
        {
          ".pinned-repo-item": {
            "name": ".repo",
            "description": ".pinned-repo-desc"
          }
        }
      ]
    }
  },
  "output": {
    "json-file": {
      "path": "repos.json"
    }
  }
}
```

- b. Execute this shell command:

```shell
$ jason-the-miner -c github.json
```

- c. Check the results in *repos.json*:

```json
[
  {
    "name": "tinycore",
    "description": "🛰 A tiny JavaScript modular architecture library"
  },
  {
    "name": "js-unit-testing-guide",
    "description": "📙 A guide to unit testing in JavaScript"
  },
  {
    "name": "kaiten",
    "description": "🌊 A jQuery plugin which offers a new navigation model for web applications."
  },
  {
    "name": "enlighten-me",
    "description": "🍵 Wisdom within the tea bag."
  },
  {
    "name": "jason-the-miner",
    "description": "⛏ A Web scraper / harvester / data extractor."
  }
]
```

Or alternatively, using pipes & redirections:

*github.json*:

```json
{
  "parse": {
    "html": {
      "schemas": [
        {
          ".pinned-repo-item": {
            "name": ".repo",
            "description": ".pinned-repo-desc"
          }
        }
      ]
    }
  }
}
```

```shell
$ curl https://github.com/mawrkus | jason-the-miner -c github.json > repos.json
```

## ⛏ Config file

```js
{
  "input": {
    "[processor name]": {
      // processor config
    }
  },
  "parse": {
    "[processor name]": {
      // processor config
    }
  },
  "pagination": {
    "[processor name]": {
      // processor config
    }
  },
  "output": {
    "[processor name]": {
      // processor config
    }
  }
}
```

### Input processors

TODO: add options doc

Jason comes with 3 built-in input processors or loaders:

- `http`
- `file`
- `stdin`

Fallback: `stdin`.

### Parse processors

TODO: add options doc (schemas)

There's a single built-in parser:

- `html`

Fallback: `no-action`.

#### Parse helpers

It is possible to define how to extract the data from each element being parsed by using the following syntax:

```
[part name]: [part selector] << [extractor] | [filter]
```

Extractors:

- `text`
- `html`
- `attr:[attribute name]`, e.g.: `.titleColumn > a << attr:title`
- `regexp:[regexp string]`, e.g.: `.secondaryInfo << regexp:[0123456789]+`

`text` by default.

Filters:

- `trim`, e.g.: `.titleColumn > a | trim`

`trim` by default.

And combining both extractor & filter:

`.quoteText << regexp:([^―]+) | trim`

### Output processors

TODO: add options doc

- `json-file`
- `csv-file`
- `stdout`

Fallback: `stdout`.

### Paginators

TODO: add options doc

- `next-link`
- `url-param`

Fallback: `no-action`.

## ⛏ API

Check https://github.com/lapwinglabs/x-ray

### registerHelper({ category, name, helper })

```js
```

### registerProcessor({ category, name, processor })

```js
```

Note on the interaction between loaders, parsers & paginators: ...

### loadConfig(configFile)

```js
```

### harvest({ loadConfig, parseConfig, outputConfig, paginationConfig } = {})

```js
```

## ⛏ Recipes

- http > html > json
- curl | stdin > html > stdout
- file > html > csv-file
- http+paglink > html > json
- http+pagparam > html > json
- http > html-custom > email
- http > html > tpl
- http > html (2 schemas) > json-file

```json
```

## ⛏ References & related links

- Web Scraping With Node.js: https://www.smashingmagazine.com/2015/04/web-scraping-with-nodejs/
- X-ray, The next web scraper. See through the <html> noise: https://github.com/lapwinglabs/x-ray
- Node.js Scraping Libraries: http://blog.webkid.io/nodejs-scraping-libraries/
- https://www.scrapesentry.com/scraping-wiki/web-scraping-legal-or-illegal/
- http://blog.icreon.us/web-scraping-and-you-a-legal-primer-for-one-of-its-most-useful-tools/

## ⛏ A final note...

Please take these guidelines in consideration when scraping:

- Content being scraped is not copyright protected.
- The act of scraping does not burden the services of the site being scraped.
- The scraper does not violate the Terms of Use of the site being scraped.
- The scraper does not gather sensitive user information.
- The scraped content adheres to fair use standards.
