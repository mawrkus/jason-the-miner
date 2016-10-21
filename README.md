# Jason the Miner
 [![npm](https://img.shields.io/npm/l/jason-the-miner.svg)](https://www.npmjs.org/package/jason-the-miner) [![npm](https://img.shields.io/npm/v/jason-the-miner.svg)](https://www.npmjs.org/package/jason-the-miner)
![Node version](https://img.shields.io/node/v/jason-the-miner.svg?style=flat-square)

Harvesting data at the HTML mine... Jason the Miner, a versatile Web scraper for Node.js.

## ⛏ Features

- **Composable:** via a modular architecture based on pluggable processors. The output of one processor feeds the input of the next one. There are 4 basic processors:
  1. `loaders`: to fetch the (HTML) data (via HTTP requests, ...)
  2. `parsers`, to parse the data & extract the relevant parts according to a predefined schema
  3. `transformers`: to transform and/or output the results (to a file, via email, ...)
  4. `paginators`: optional, to establish a strategy when scraping multiple pages (follow the "next" link, ...)

- **Configurable:** each processor can be chosen & configured independently.
- **Extensible:** new processors can be registered.
- **CLI-friendly:** Jason the Miner works well with pipes & redirections.
- **Promise-based API**.
- **MIT-licensed**.

## ⛏ Installation

```shell
$ npm install -g jason-the-miner
```

## ⛏ Usage

#### CLI usage example

Let's find the most starred Javascript scrapers from GitHub:

*github-config.json*:
```js
{
  "load": {
    "http": {
      "url": "https://github.com/search?q=scraper&l=JavaScript&type=Repositories&s=stars&o=desc"
    }
  },
  "parse": {
    "html": {
      "schemas": [
        {
          "repos": {
            "_$": ".repo-list-item",
            "name": ".repo-list-name > a",
            "description": ".repo-list-description | trim",
          }
        }
      ]
    }
  },
  "transform": {
    "json-file": {
      "path": "demo/data/out/github-repos.json"
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
      "schemas": [
        {
          "repos": {
            "_$": ".repo-list-item",
            "name": ".repo-list-name > a",
            "description": ".repo-list-description | trim",
          }
        }
      ]
    }
  },
}
```

*Shell:*
```shell
$ curl https://github.com/search?q=scraper&l=JavaScript&type=Repositories | jason-the-miner -c github-config.json > github-repos.json

$ cat ./github-repos.json
```

#### API usage example

```js
const JasonTheMiner = require('jason-the-miner');

const jason = new JasonTheMiner();

jason.configure({
  parse: {
    html: {
      schemas: [
        {
          repos: {
            _$: ".repo-list-item",
            name: ".repo-list-name > a",
            description: ".repo-list-description | trim",
          }
        }
      ]
    }
  }
});

const load = {
  http: {
    url: "https://github.com/search?q=scraper",
    params: {
      l: JavaScript,
      type: Repositories
      s: stars,
      o: desc
    }
  }
};

jason.harvest({ load }).then(results => console.log(results));
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
  "paginate": {
    "[paginator name]": {
      // paginator options
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

- `http`: uses [Axios](https://github.com/mzabriskie/axios) as HTTP client. It supports the same options (including "headers", "proxy", etc.).
- `file`: reads the content of a file. Options: `path`.
- `stdin`: reads the content from the standard input. Options: `encoding`.

### Parsers

- `html`: uses [Cheerio](https://github.com/cheeriojs/cheerio) as HTML parser. Options: `schemas`.
- `json`: uses [lodash.get](https://lodash.com/docs/4.16.4#get) as JSON parser. Options: `schemas`.

#### Schemas definition

```js
...
  "html": {
    "schemas": [
      {
        "repos": {
          "_$": ".repo-list-item",
          "_slice": "0,5",
          "name": ".repo-list-name > a",
          "description": ".repo-list-description | trim",
          "last-update": ".repo-list-meta relative-time",
          "stats": {
            "_$": ".repo-list-stats",
            "⭐": "a[aria-label=Stargazers] | trim",
            "forks": "a[aria-label=Forks] | trim"
          }
        }
      }
    ]
  }
...
```

A schema is just a plain object that defines:

- the name of the collection of elements you want to extract: `repos`,
- the selector `_$` to find those elements: `.repo-list-item`,
- for each element found:
  - the properties to extract (`name`, `description`, ...) and
  - how to extract each of them: the selector to use, as well as an optional extractor and/or filter (see "Parse helpers below")
- you can also limit the number of elements with the `_slice` option

The definition is *recursive*. Inception-style, without limits.

Jason also supports multiple schemas:

```js
...
  "html": {
    "schemas": [
      {
        "repos": {
          "_$": ".repo-list-item",
          "name": ".repo-list-name > a",
          "description": ".repo-list-description | trim",
          "last-update": ".repo-list-meta relative-time",
          "stats": {
            "_$": ".repo-list-stats",
            "⭐": "a[aria-label=Stargazers] | trim",
            "forks": "a[aria-label=Forks] | trim"
          }
        }
      },
      {
        "metas": "meta[property] < attr:property"
      }
    ]
  }
...
```

##### Parse helpers

You can define how to extract a property value using this syntax:

```
[property name]: [selector] < [extractor] | [filter]
```

Jason has 4 built-in **extractors** (`text` by default):

- `text`
- `html`
- `attr:[attribute name]`
- `regexp:[regexp string]`

And 2 built-in **filter**:

- `trim`
- `digits`

An example combining both:

```js
...
  "movies": {
    "_$": ".lister-list > tr",
    "🎥 title": ".titleColumn > a | trim",
    "📅 year": ".secondaryInfo < regexp:(\\d+)",
    "⭐ rating": ".ratingColumn > strong",
    "👥 crew": ".titleColumn > a < attr:title"
  }
...
```

### Transformers

- `stdout`: writes the results to stdout. Options: `encoding`.
- `json-file`: writes the results to a JSON file. Options: `path`.
- `csv-file`: uses [csv-stringify](http://csv.adaltas.com/stringify/) & supports the same configuration options, as well as `path`. If multiple schemas are defined, one file per schema will be created. The name of the schema will be appended to the name of the file.

### Paginators

- `url-param`: increment an URL query parameter. Options: `param`, `inc`, `limit` & `rps`.
- `follow-link`: follows a single or more links. Options: `selector`, `limit`, `mode` ("single" or "all") & `rps`.

The `rps` option limits the number of requests par second.

Examples:

```js
...
  "url-param": {
    "param": "p",
    "inc": 1,
    "limit": 99,
    "rps": 10
  }
...
```

Will result in 100 requests, incrementing the "p" parameter by 1 from one request to the next one.

```js
...
  "follow-link": {
    "selector": "episode",
    "slice": "0,3",
    "mode": "all",
    "limit": 1
  }
...
```

Will create 3 requests, from the href attributes of the first 3 ".episode" links.

## ⛏ API

### configure(options)

(Re-)Configures Jason.

```js
jason.configure({
  parse: {
    html: {
      schemas: [
        {
          "repos": {
            "_$": ".repo-list-item",
            "name": ".repo-list-name > a",
            "description": ".repo-list-description | trim",
            "⭐": "a[aria-label=Stargazers] | trim"
          }
        }
      ]
    }
  }
});

jason.configure({
  load: {
    http: {
      url: "https://github.com/search?q=scraper&l=Go&type=Repositories"
    }
  }
});
```

### loadConfig(configFile)

Loads a config from a JSON file.

```js
jason.loadConfig('./harvest-me.json');
```

### harvest({ load, parse, output, pagination } = {})

Launches the process. Options can be passed to override the current config.

```js
jason.loadConfig('./harvest-me.json')
  .then(() => jason.harvest({
    load: {
      http: {
        url: "https://github.com/search?q=scraper&l=Python&type=Repositories"
      }
    }
  }))
  .catch(error => console.error(error));
```

##### registerHelper({ category, name, helper })

Registers a parse helpers in one of the 2 categories: `extract` or `filter`.
`helper` must be a function.

```js
jason.registerHelper({
  category: 'filter',
  name: 'remove-protocol',
  helper: text => text.replace(/^https?:/, '')
});
```

##### registerProcessor({ category, name, processor })

Registers a new processor in one of the 4 categories: `load`, `parse`, `paginate` or `transform`.
`processor` must be a class implementing the `run` method:

```js
jason.registerProcessor({
  category: 'transform',
  name: 'email',
  processor: Emailer
});

class Emailer {
  constructor(config) {
    // receives automatically its config
  }

  /**
   * @param {*}
   * @return {Promise.<*>}
   */
  run() {
    // must be implemented.
  }
}
```

In order to enable pagination, loaders & parsers **must also implement** the `getRunContext` method.
For instance, the `html` parser returns the Cheerio object that allows the `follow-link` paginator to search for the "next" URL:

```js
class HtmlParserEmailer {
  // ...
   /**
    * @param {string} html
    * @return {Promise.<Object[]>}
    */
   run(html) {
    // ...
    this._$ = cheerio.load(html);
    // ...
   }

   /**
    * @return {Object}
    */
    getRunContext() {
      return { $: this._$ };
    }
  // ...
}

class FollowLinkPaginator {
  // ...
  run({ loaderRunContext, parserRunContext } = {}) {
    const $ = parserRunContext.$;
    const url = $(this._selector).first().attr('href');
    return [{ url }];
  }
  // ...
}
```

## ⛏ Recipes

Clone the project...

```shell
$ git clone https://github.com/mawrkus/jason-the-miner.git
$ cd jason-the-miner
```

...and have a look at the `demo` folder.

To launch all the demos:

```shell
$ npm install && npm run demo
```

## ⛏ References & related links

- Web Scraping With Node.js: https://www.smashingmagazine.com/2015/04/web-scraping-with-nodejs/
- X-ray, The next web scraper. See through the <html> noise: https://github.com/lapwinglabs/x-ray
- Simple, lightweight and expressive web scraping with Node.js: https://github.com/eeshi/node-scrapy
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
