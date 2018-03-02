# Jason the Miner
 [![npm](https://img.shields.io/npm/l/jason-the-miner.svg)](https://www.npmjs.org/package/jason-the-miner) [![npm](https://img.shields.io/npm/v/jason-the-miner.svg)](https://www.npmjs.org/package/jason-the-miner)
![Node version](https://img.shields.io/node/v/jason-the-miner.svg?style=flat-square)

Harvesting data at the HTML mine... Jason the Miner, a versatile Web scraper for Node.js.

## ⛏ Features

- **Composable:** via a modular architecture based on pluggable processors. The output of one processor feeds the input of the next one. There are 4 basic processors:
  1. `loaders`: to fetch the data (via HTTP requests, by reading text files, ...)
  2. `parsers`: to parse the data & extract the relevant parts according to predefined schemas
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
            "_$": ".repo-list .repo-list-item",
            "name": "h3 > a",
            "description": "p | trim"
          }
        }
      ]
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
      "schemas": [
        {
          "repos": {
            "_$": ".repo-list .repo-list-item",
            "name": "h3 > a",
            "description": "p | trim"
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
    schemas: [
      {
        repos: {
          "_$": ".repo-list .repo-list-item",
          "name": "h3 > a",
          "description": "p | trim"
        }
      }
    ]
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
- `file`: reads the content of a file. Options: `path` and `stream=false`
- `stdin`: reads the content from the standard input. Options: `encoding="utf8"`.

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
          "_$": ".repo-list .repo-list-item",
          "_slice": "0,5",
          "name": "h3 > a",
          "description": "p | trim",
          "last-update": "relative-time < attr(datetime)",
          "stats": {
            "_$": "div:last-child",
            "stars": "a[aria-label=Stargazers] | trim",
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
- the selector `_$` to find those elements: `.repo-list .repo-list-item`,
- for each element found:
  - the properties to extract (`name`, `description`, ...) and
  - how to extract each of them: the selector to use, as well as an optional extractor and/or filter (see "Parse helpers below")
- you can also limit the number of elements with the `_slice` option

The definition is *recursive*.

Jason also supports multiple schemas:

```js
...
  "html": {
    "schemas": [
      {
        "repos": {
          "_$": ".repo-list .repo-list-item",
          "name": "h3 > a",
          "description": "p | trim",
          "last-update": "relative-time < attr(datetime)",
          "stats": {
            "_$": "div:last-child",
            "stars": "a[aria-label=Stargazers] | trim",
            "forks": "a[aria-label=Forks] | trim"
          }
        }
      },
      {
        "metas": "meta[property] < attr(property)"
      }
    ]
  }
...
```

##### Parse helpers

You can specify how to extract a value with this syntax:

```
[property name]: [selector] < [extractor] | [filter]
```

Jason has 4 built-in **extractors**:

- `text` (by default)
- `html`
- `attr([attribute name])`
- `regex([regex string])`

And 4 built-in **filters**:

- `trim`
- `single-space`
- `lowercase`
- `uppercase`

For example:

```js
...
  "movies": {
    "_$": ".lister-list > tr",
    "🎥 title": ".titleColumn > a | trim",
    "📅 year": ".secondaryInfo < regex(.*(\\d+))",
    "⭐ rating": ".ratingColumn > strong",
    "👥 crew": ".titleColumn > a < attr(title) | trim"
  }
...
```

### Transformers

- `stdout`: writes the results to stdout. Options: `encoding="utf8"`.
- `json-file`: writes the results to a JSON file. Options: `path`.
- `csv-file`: uses [csv-stringify](http://csv.adaltas.com/stringify/) & supports the same configuration options, as well as `path`. If multiple schemas are defined, one file per schema will be created. The name of the schema will be appended to the name of the file.
- `email`: uses [nodemailer](https://github.com/nodemailer/nodemailer/) & supports the same configuration options.

### Paginators

- `url-param`: increment an URL query parameter. Options: `param`, `inc=1`, `max=1` & `concurrency=1`.
- `follow-link`: follows links. Options: `selector`, `slice`, `depth=1` & `concurrency=1`. Note that `depth` supports also the "Infinity" value, which will be converted to... Infinity. Use with caution.

Examples:

```js
...
  "url-param": {
    "param": "offset",
    "inc": 25,
    "max": 250,
    "concurrency": 3
  }
...
```

Will create as many requests as needed for the "offset" parameter to reach 250, incrementing it by 25 from one request to the next one and limiting the whole process to a maximum of 3 concurrent requests.

```js
...
  "follow-link": {
    "selector": "a.episode",
    "slice": "0,1",
    "concurrency": 1,
    "depth": 10
  }
...
```

Will follow 10 times the first ".episode" link (by extracting its "href" attribute).

## ⛏ API

### constructor({ fallbacks = {} } = {})

`fallbacks` defines which processor will be used when not explicitly configured (or missing in the config file):
- `load`: 'identity',
- `parse`: 'identity',
- `paginate`: 'noop',
- `transform`: 'identity'

The fallbacks change when using the CLI (see `bin/jason-the-miner.js`):
- `load`: 'stdin',
- `parse`: 'html',
- `paginate`: 'noop',
- `transform`: 'stdout'

### loadConfig(configFile)

Loads a config from a JSON file.

```js
jason.loadConfig('./harvest-me.json');
```

### harvest({ load, parse, output, pagination } = {})

Launches the whole harvesting process:

```js
jason.loadConfig('./config.json')
  .then(() => jason.harvest())
  .catch(error => console.error(error));
```

Options can also be passed to temporarily override the current config:

```js
jason.loadConfig('./config.json')
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

jason.loadConfig('./harvest-me.json')
  .then(() => jason.harvest())
  .then(results => {
    allResults.push(results);

    jason.config.load.http.url = 'https://github.com/search?q=scraper&l=Python&type=Repositories';

    return jason.harvest();
  })
  .then(results => {
    allResults.push(results);
  })
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
  run() {
    // must be implemented and must return a promise.
  }
}

jason.config.transform = {
  template: {
    "templatePath": "my-template.tpl",
    "outputPath": "my-page.html"
  }
};
```

In order to enable pagination, loaders & parsers **must also implement** the `getRunContext` method.
For instance, the `html` parser returns the Cheerio object that allows the `follow-link` paginator to search for the "next" URL:

```js
class HtmlParser {
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
$ npm install
```

...and have a look at the `demos` folder.

To launch all the demos:

```shell
$ npm run demos
```

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
