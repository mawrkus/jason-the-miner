# Jason the Miner
 [![npm](https://img.shields.io/npm/l/jason-the-miner.svg)](https://www.npmjs.org/package/jason-the-miner) [![npm](https://img.shields.io/npm/v/jason-the-miner.svg)](https://www.npmjs.org/package/jason-the-miner)
![Node version](https://img.shields.io/node/v/jason-the-miner.svg?style=flat-square)

Harvesting data at the html mine... Jason the Miner, a modular Web scraper for Node.js.

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

## ⛏ Installation

```shell
$ npm install -g jason-the-miner
```

## ⛏ Examples

#### CLI

Let's find the most starred Javascript scrapers from GitHub:

- a. Create the *github-config.json* config file:

```json
{
  "load": {
    "http": {
      "url": "https://github.com/search?l=JavaScript&o=desc&q=scraper&s=stars&type=Repositories"
    }
  },
  "parse": {
    "html": {
      "schemas": [
        {
          ".repo-list-item": {
            "name": ".repo-list-name > a",
            "description": ".repo-list-description | trim",
            "⭐": "a[aria-label=Stargazers] | trim"
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

- b. Execute this shell command:

```shell
$ jason-the-miner -c github-config.json
```

- c. Check the results in *github-repos.json*.

Or alternatively, using pipes & redirections:

*github-config.json*:

```json
{
  "parse": {
    "html": {
      "schemas": [
        {
          ".repo-list-item": {
            "name": ".repo-list-name > a",
            "description": ".repo-list-description | trim",
            "⭐": "a[aria-label=Stargazers] | trim"
          }
        }
      ]
    }
  }
}
```

```shell
$ curl https://github.com/search?l=JavaScript&o=desc&q=scraper&s=stars&type=Repositories | jason-the-miner -c github-config.json > github-repos.json
```

#### API

```js
const JasonTheMiner = require('jason-the-miner');

const jason = new JasonTheMiner();

jason.configure({
  load: {
    http: {
      url: "https://github.com/search?l=JavaScript&o=desc&q=scraper&s=stars&type=Repositories"
    }
  },
  parse: {
    html: {
      schemas: [
        {
          ".repo-list-item": {
            "name": ".repo-list-name > a",
            "description": ".repo-list-description | trim",
            "⭐": "a[aria-label=Stargazers] | trim"
          }
        }
      ]
    }
  }
});

jason.harvest().then(results => console.log(results));
```

## ⛏ Config file

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

- `http`: uses [Axios](https://github.com/mzabriskie/axios) as HTTP client. It supports the same configuration options.  
- `file`: reads the content of a file. Options: `path`.
- `stdin`: reads the content from the standard input. Options: `encoding`.

### Parsers

There's a single built-in parser:

- `html`: uses [Cheerio](https://github.com/cheeriojs/cheerio) as HTML parser. Options: `schemas`.

#### Schemas definition

```json
...
  "html": {
    "schemas": [
      {
        ".repo-list-item": {
          "name": ".repo-list-name > a",
          "description": ".repo-list-description | trim",
          "last-update": ".repo-list-meta relative-time",
          "⭐": "a[aria-label=Stargazers] | trim"
        }
      }
    ]
  }
...
```

A schema is just a plain object that associates a selector (`.repo-list-item`) to the definition of the parts that you want to extract.
Jason will find all the elements that match the selector & for each one of them, it will extract all the parts defined.

Jason also supports multiple schemas:

```json
...
  "html": {
    "schemas": [
      {
        "head": {
          "page-title": "title"
        }
      },
      {
        ".repo-list-item": {
          "name": ".repo-list-name > a",
          "description": ".repo-list-description | trim",
          "last-update": ".repo-list-meta relative-time",
          "⭐": "a[aria-label=Stargazers] | trim"
        }
      }
    ]
  }
...
```

##### Parse helpers

You can customize the extraction of the parts values:

```
[part name]: [part selector] << [extractor] | [filter]
```

Jason has 4 built-in **extractors** (`text` by default):

- `text`
- `html`
- `attr:[attribute name]`
- `regexp:[regexp string]`

And 1 built-in **filter**:

- `trim`

An example combining both:

```json
...
  ".lister-list > tr": {
    "🎥 title": ".titleColumn > a | trim",
    "📅 year": ".secondaryInfo << regexp:[0123456789]+",
    "⭐ rating": ".ratingColumn > strong",
    "👥 crew": ".titleColumn > a << attr:title | trim"
  }
...
```

### Transformers

- `json-file`: writes the results to a JSON file. Options: `path`.
- `csv-file`: uses [csv-stringify](http://csv.adaltas.com/stringify/) & supports the same configuration options, as well as `path`.
- `stdout`: writes the results to stdout. Options: -.

### Paginators

- `next-link`: follows the "next" link. Options: `selector` and `limit`.
- `url-param`: increment an URL query parameter. Options: `param`, `inc` & `limit`.

Examples:

```json
...
  "next-link": {
    "selector": "a#load_next_episodes",
    "limit": 20
  }
...
```

```json
...
  "url-param": {
    "param": "p",
    "inc": 1,
    "limit": 3
  }
...
```

## ⛏ API

### configure(options)

(Re-)Configures Jason.

```js
jason.configure({
  load: {
    http: {
      url: "https://github.com/search?l=JavaScript&o=desc&q=scraper&s=stars&type=Repositories"
    }
  },
  parse: {
    html: {
      schemas: [
        {
          ".repo-list-item": {
            "name": ".repo-list-name > a",
            "description": ".repo-list-description | trim",
            "⭐": "a[aria-label=Stargazers] | trim"
          }
        }
      ]
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

Launches the process. Optional options can be passed to override the current config.

```js
jason.loadConfig('./harvest-me.json')
  .then(() => jason.harvest({
    load: {
      http: {
        url: "https://github.com/search?l=JavaScript&o=desc&q=scraper&s=stars&type=Repositories"
      }
    }
  }))
  .catch(error => console.error(error));
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
For instance, the `html` parser returns the Cheerio object that allows the `next-link` paginator to search for the next URL:

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

class NextLinkPaginator {
  // ...
  //
  run({ loaderRunContext, parserRunContext } = {}) {
    const $ = parserRunContext.$;
    const url = $(this._selector).first().attr('href');
    return [{ url }];
  }

  // ...
}
```

##### registerHelper({ category, name, helper })

Register a parse helpers in one of the 2 categories: `extract` or `filter`.
`helper` must be a function.

```js
jason.registerHelper({
  category: 'filter',
  name: 'remove-protocol',
  helper: text => text.replace(/^https?:/, '')
});
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
$ npm i && npm run demo
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
