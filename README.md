# Jason the Miner
 [![npm](https://img.shields.io/npm/l/jason-the-miner.svg)](https://www.npmjs.org/package/jason-the-miner) [![npm](https://img.shields.io/npm/v/jason-the-miner.svg)](https://www.npmjs.org/package/jason-the-miner)
![Node version](https://img.shields.io/node/v/jason-the-miner.svg?style=flat-square)

Harvesting data at the HTML mine... Jason the Miner, a versatile Web scraper for Node.js.

## ⛏ Features

- **Composable:** via a modular architecture based on pluggable processors. The output of one processor feeds the input of the next one. There are 3 categories processors:
  1. `loaders`: to fetch the data (via HTTP requests, by reading text files, etc.)
  2. `parsers`: to parse the data & extract the relevant parts according to predefined schemas (HTML by default)
  3. `transformers`: to transform and/or output the results (to a CSV file, via email, etc.)
- **Configurable:** each processor is chosen & configured independently.
- **Extensible:** you can register your own custom processors.
- **CLI-friendly:** Jason the Miner works well with pipes & redirections.
- **Promise-based API**.
- **MIT-licensed**.

## ⛏ Installation

```shell
$ npm install -g jason-the-miner
```

## ⛏ Demos

Clone the project...

```shell
$ git clone https://github.com/mawrkus/jason-the-miner.git
$ cd jason-the-miner
$ npm install
$ npm run demos
```

...and have a look at the `demos` folder.

## ⛏ Usage

#### CLI example

Scrape the most starred Javascript scrapers from GitHub:

*github-config.json*:
```js
{
  "load": {
    "http": {
      "url": "https://github.com/search?l=JavaScript&o=desc&q=scraper&s=stars&type=Repositories"
    }
  },
  "parse": {
    "html": {
      "repos": [{
        "_$": ".repo-list .repo-list-item",
        "name": "h3 > a",
        "description": "div:first-child > p | trim"
      }]
    }
  },
  "transform": {
    "json-file": {
      "path": "./github-repos.json"
    }
  }
}
```

*Shell*:
```shell
$ jason-the-miner -c github-config.json
```

OR alternatively, with pipes & redirections:

*github-config.json:*
```js
{
  "parse": {
    "html": {
      "repos": [{
        "_$": ".repo-list .repo-list-item",
        "name": "h3 > a",
        "description": "div:first-child > p | trim"
      }]
    }
  },
}
```

*Shell:*
```shell
$ curl https://github.com/search?q=scraper&l=JavaScript&type=Repositories | jason-the-miner -c github-config.json > github-repos.json
$ cat ./github-repos.json
```

#### API example

```js
const JasonTheMiner = require('jason-the-miner');

const jason = new JasonTheMiner();

const load = {
  http: {
    url: "https://github.com/search",
    params: {
      q: "scraper",
      l: "JavaScript",
      type: "Repositories",
      s: "stars",
      o: "desc"
    }
  }
};

const parse = {
  html: {
    repos: [{
      _$: ".repo-list .repo-list-item",
      name: "h3 > a",
      description: "div:first-child > p | trim"
    }]
  }
};

jason.harvest({ load, parse }).then(results => console.log(results));
```

## ⛏ The config file

```js
{
  "load": {
    "[loader name]": {
      // loader options
    }
  },
  "parse": {
    "[parser name]": {
      // parser options
    }
  },
  "transform": {
    "[transformer name]": {
      // transformer options
    }
  }
}
```

### Loaders

Jason the Miner comes with 3 built-in loaders:

- `http`: uses [Axios](https://github.com/mzabriskie/axios) as HTTP client & supports the same options (including "headers", "proxy", etc.) as well as `[_concurrency=1]` to limit the number concurrent requests when following/paginating.
- `file`: reads the content of a file. Options: `path`, `[stream=false]` & `[encoding="utf8"]`.
- `stdin`: reads the content from the standard input. Options: `[encoding="utf8"]`.

### Parsers

- `html`: uses [Cheerio](https://github.com/cheeriojs/cheerio) as HTML parser.

#### Schemas definition

```js
...
  "html": {
    "title": "title | trim",
    "metas": {
      "lang": "html < attr(lang)",
      "content-type": "meta[http-equiv='Content-Type'] < attr(content)"
    },
    "stylesheets": ["link[rel='stylesheet'] < attr(href)"],
    "repos": [{
      "_$": ".repo-list .repo-list-item ? text(crawler)",
      "_slice": "0,3",
      "name": "h3 > a",
      "last-update": "relative-time < attr(datetime)",
      "_follow": {
        "_link": "h3 > a",
        "description": "meta[property='og:description'] < attr(content) | trim",
        "url": "link[rel='canonical'] < attr(href)",
        "stats": {
          "_$": ".pagehead-actions",
          "watchers": "li:nth-child(1) a.social-count | trim",
          "stars": "li:nth-child(2) a.social-count | trim",
          "forks": "li:nth-child(3) a.social-count | trim"
        },
        "_follow": {
          "_link": ".js-repo-nav span[itemprop='itemListElement']:nth-child(2) > a",
          "open-issues": [{
            "_$": ".js-navigation-container li > div > div:nth-child(3)",
            "desc": "a:first-child | trim",
            "opened": "relative-time < attr(datetime)"
          }],
          "_paginate": {
            "link": "a[rel='next']",
            "slice": "0,1",
            "depth": 2
          }
        }
      }
    }],
  }
...
```

A schema is a plain object that recursively defines:
 - the name of the values/collection of values that you want to extract: `title` (single value), `metas` (object), `stylesheets` (collection), `repos` (collection)
 - how to extract them: `[selector] ? [matcher] < [extractor] | [filter]` (see "Parse helpers" below)

- `_$` acts as a root selector: further parsing will happen in the context of the element identified by this selector
- `_slice` limits the number of elements to parse
- `_follow` tells Jason to follow a **single link** (fetch new data) & to continue scraping when the new data is received
- `_paginate` tells Jason to paginate (fetch & scrape new data) & to merge the new values in the current context, here **multiple links** can be selected to scrape in parallel multiple pages (be careful)

##### Parse helpers

You can specify how to extract a value with the following syntax:

```
[property name]: [selector] ? [matcher] < [extractor] | [filter]
```

For instance:

```js
...
"repos": [".repo-list-item h3 > a ? text(crawler) < attr(title) | trim"]
...
```

Jason has 4 built-in element **matchers**:

- `text([regex string])`
- `html([regex string])`
- `attr([attribute name],[regex])`

They are used to test an element in order to decide whether to include/discard it from parsing.
If not specified, Jason includes every element.

4 built-in text **extractors**:

- `text` (by default)
- `html`
- `attr([attribute name])`
- `regex([regex string])`

and 4 built-in text **filters**:

- `trim`
- `single-space`
- `lowercase`
- `uppercase`

### Transformers

- `stdout`: writes the results to stdout. Options: `[encoding="utf8"]`.
- `json-file`: writes the results to a JSON file. Options: `path` & `[encoding="utf8"]`.
- `csv-file`: writes the results to a CSV file. Uses [csv-stringify](http://csv.adaltas.com/stringify/) & supports the same options, as well as `path` and `[encoding='utf8']`.
- `email`: uses [nodemailer](https://github.com/nodemailer/nodemailer/) & supports the same options.

## ⛏ API

### constructor({ fallbacks = {} } = {})

`fallbacks` defines which processor to use when not explicitly configured (or missing in the config file):
- `load`: 'identity',
- `parse`: 'identity',
- `transform`: 'identity'

The fallbacks change when using the CLI (see `bin/jason-the-miner.js`):
- `load`: 'stdin',
- `parse`: 'html',
- `transform`: 'stdout'

### loadConfig(configFile)

Loads a config from a JSON or JS file.

```js
jason.loadConfig('./harvest-me.json');
```

### harvest({ load, parse, output, pagination } = {})

Launches the whole harvesting process:

```js
jason
  .loadConfig('./config.json')
  .then(() => jason.harvest())
  .catch(error => console.error(error));
```

You can also pass custom options to temporarily override the current config:

```js
jason
  .loadConfig('./config.json')
  .then(() => jason.harvest({
    load: {
      http: {
        url: "https://github.com/search?q=scraper&l=Python&type=Repositories"
      }
    }
  }))
  .catch(error => console.error(error));
```

To permanently override the current config, you can directly modify Jason's `config` property:

```js
const allResults = [];

jason
  .loadConfig('./harvest-me.json')
  .then(() => jason.harvest())
  .then((results) => {
    allResults.push(results);

    jason.config.load.http.url = 'https://github.com/search?q=scraper&l=Python&type=Repositories';

    return jason.harvest();
  })
  .then((results) => {
    allResults.push(results);
  })
  .catch(error => console.error(error));
```

##### registerHelper({ category, name, helper })

Registers a parse helpers in one of the 3 categories: `match`, `extract` or `filter`.
`helper` must be a function.

```js
jason.registerHelper({
  category: 'filter',
  name: 'remove-protocol',
  helper: text => text.replace(/^https?:/, '')
});
```

##### registerProcessor({ category, name, processor })

Registers a new processor in one of the 3 categories: `load`, `parse` or `transform`.
`processor` must be a class implementing the `run()` method:

```js
jason.registerProcessor({
  category: 'transform',
  name: 'template',
  processor: Templater
});

class Templater {
  constructor(config) {
    // receives automatically its config
  }

  /**
   * @param {*}
   * @return {Promise.<*>}
   */
  run(results) {
    // must be implemented & must return a promise.
  }
}

jason.config.transform = {
  template: {
    "templatePath": "my-template.tpl",
    "outputPath": "my-page.html"
  }
};
```

Note that loaders **must also implement** the `getConfig()` and `buildLoadParams({ link })` methods.
Have a look at the source code for more info.

## ⛏ Tests

```shell
$ git clone https://github.com/mawrkus/jason-the-miner.git
$ cd jason-the-miner
$ npm install
$ npm run test
```

## ⛏ References & related links

- Web Scraping With Node.js: https://www.smashingmagazine.com/2015/04/web-scraping-with-nodejs/
- X-ray, The next web scraper. See through the <html> noise: https://github.com/lapwinglabs/x-ray
- Simple, lightweight & expressive web scraping with Node.js: https://github.com/eeshi/node-scrapy
- Node.js Scraping Libraries: http://blog.webkid.io/nodejs-scraping-libraries/
- https://www.scrapesentry.com/scraping-wiki/web-scraping-legal-or-illegal/
- http://blog.icreon.us/web-scraping-and-you-a-legal-primer-for-one-of-its-most-useful-tools/
- Web scraping o rastreo de webs y legalidad: https://www.youtube.com/watch?v=EJzugD0l0Bw

## ⛏ A final note...

Please take these guidelines in consideration when scraping:

- Content being scraped is not copyright protected.
- The act of scraping does not burden the services of the site being scraped.
- The scraper does not violate the Terms of Use of the site being scraped.
- The scraper does not gather sensitive user information.
- The scraped content adheres to fair use standards.
