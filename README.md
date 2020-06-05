# Jason the Miner

[![npm](https://img.shields.io/npm/l/jason-the-miner.svg)](https://www.npmjs.org/package/jason-the-miner) [![npm](https://img.shields.io/npm/v/jason-the-miner.svg)](https://www.npmjs.org/package/jason-the-miner)
![Node version](https://img.shields.io/node/v/jason-the-miner.svg?style=flat-square)

Harvesting data at the `<html>` mine... Here comes Jason the Miner, a versatile Web scraper for Node.js.

## ⛏ Features

- **Composable:** via a modular architecture based on pluggable processors. The output of one processor feeds the input of the next one. There are 3 types of processors:
  1. loaders: to fetch the data (via HTTP requests, by reading text files, etc.)
  2. parsers: to parse the data (HTML by default) & extract the relevant parts according to a predefined schema
  3. transformers: to transform and/or output the results (to a CSV file, via email, etc.)
- **Configurable:** each processor can be chosen & configured independently
- **Extensible:** you can register your own custom processors
- **CLI-friendly:** Jason the Miner works well with pipes & redirections
- **Promise-based API**
- **MIT-licensed**

## ⛏ Installing

```shell
npm install -g jason-the-miner
```

If you don't want to install it, you can use it directly with [npx](https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner):

```shell
npx jason-the-miner -c my-config.json
```

## ⛏ Demos

Clone the project:

```shell
$ git clone https://github.com/mawrkus/jason-the-miner.git
$ cd jason-the-miner
$ npm install
$ npm run demos
```

Then have a look at the [demos](demos/configs) folder, you'll find examples of scraping:

- Simple GitHub search results (JSON, CSV, Markdown output)
- More complex GitHub search results (including following links & paginating issues)
- Goodreads books, following links to Amazon to grab their product ID
- Google search results for finding mobile apps in various blogs, etc.
- IMDb images gallery links with pagination
- Mixcloud stats, templating them & sending them by mail
- Mixcloud SPA scraping, by controlling a headless Chrome browser with [Puppeteer](https://github.com/puppeteer/puppeteer/)
- Avatars and downloading them
- A CSV file to bulk insert data to Elasticsearch

## ⛏ Examples

#### CLI

Scraping the most popular Javascript scrapers from GitHub:

```js
// github-config.json
{
  "load": {
    "http": {
      "url": "https://github.com/search",
      "params": {
        "q": "scraper",
        "l": "JavaScript",
        "type": "Repositories",
        "s": "stars",
        "o": "desc"
      }
    }
  },
  "parse": {
    "html": {
      "repos": [".repo-list .repo-list-item h3 > a"]
    }
  },
  "transform": {
    "json-file": {
      "path": "./github-repos.json"
    }
  }
}
```

```shell
jason-the-miner -c github-config.json
```

Alternatively, with pipes & redirections:

```js
// github-config.json
{
  "parse": {
    "html": {
      "repos": [".repo-list .repo-list-item h3 > a"]
    }
  }
}
```

```shell
curl https://github.com/search?q=scraper&l=JavaScript&type=Repositories&s=stars&o=desc | jason-the-miner -c github-config.json > github-repos.json
```

#### API

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
    "repos": [".repo-list .repo-list-item h3 > a"]
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

Jason the Miner comes with 4 built-in loaders:

| Name | Description | Options |
| --- |---| --- |
| `http` | Uses [axios](https://github.com/mzabriskie/axios) as HTTP client | All [axios](https://github.com/mzabriskie/axios) request options + `[_concurrency=1]` (to limit the number of concurrent requests when following/paginating) &  `[_cache]` (to cache responses on the file system) |
| `file` | Reads the content of a file | `path`, `[stream=false]`, `[encoding="utf8"]` & `[_concurrency=1]` (to limit the number of concurrent requests when paginating) |
| `csv-file` | Uses [csv-parse](https://github.com/adaltas/node-csv-parse) to read a CSV file | All [csv-parse](http://csv.adaltas.com/parse) options in a `csv` object + `path`+ `[encoding="utf8"]` |
| `stdin` | Reads the content from the standard input | `[encoding="utf8"]` |

For example, an HTTP load config with responses cached in the "tests/http-cache" folder:

```js
...
"load": {
  "http": {
    "baseURL": "https://github.com",
    "url": "/search?l=JavaScript&o=desc&q=scraper&s=stars&type=Repositories",
    "_concurrency": 2,
    "_cache": {
      "_folder": "tests/http-cache"
    }
  }
}
...
```

Check the [demos](demos/configs) folder for more examples.

### Parsers

Currently, Jason the Miner comes with 2 built-in parsers:

| Name | Description | Options |
| --- |---| --- |
|`html`|Parses HTML, built with [Cheerio](https://github.com/cheeriojs/cheerio)|A parse schema|
|`csv`|Parses CSV, built with [csv-parse](https://github.com/adaltas/node-csv-parse)|All [csv-parse](http://csv.adaltas.com/parse) options|

#### HTML schema definition

##### Examples

```js
...
  "html": {
    // Single value
    "repo": ".repo-list .repo-list-item h3 > a"

    // Collection of values
    "repos": [".repo-list .repo-list-item h3 > a"]

    // Single object
    "repo": {
      "name": ".repo-list .repo-list-item h3 > a",
      "description": ".repo-list .repo-list-item div:first-child"
    }

    // Single object, providing a root selector _$
    "repo": {
      "_$": ".repo-list .repo-list-item",
      "name": "h3 > a",
      "description": "div:first-child"
    }

    // Collection of objects
    "repos": [{
      "_$": ".repo-list .repo-list-item",
      "name": "h3 > a",
      "description": "div:first-child"
    }]

    // Following
    "repos": [{
      "_$": ".repo-list .repo-list-item",
      "name": "h3 > a",
      "description": "div:first-child",
      "_follow": {
        "_link": "h3 > a",
        "stats": {
          "_$": ".pagehead-actions",
          "watchers": "li:nth-child(1) a.social-count",
          "stars": "li:nth-child(2) a.social-count",
          "forks": "li:nth-child(3) a.social-count"
        }
      }
    }]

    // Paginating
    "repos": [{
      "_$": ".repo-list .repo-list-item",
      "name": "h3 > a",
      "description": "div:first-child",
      "_paginate": {
        "_link": ".pagination > a[rel='next']",
        "_depth": 1
      }
    }]
  }
...
```

**Full flavour**

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
            "_link": "a[rel='next']",
            "_slice": "0,1",
            "_depth": 2
          }
        }
      }
    }],
  }
...
```

As you can see, a schema is a plain object that recursively defines:
 - the names of the values/collection of values that you want to extract: "title" (single value), "metas" (object), "stylesheets" (collection of values), "repos" (collection of objects)
 - how to extract them: `[selector] ? [matcher] < [extractor] | [filter]` (check "Parse helpers" below)

Additional instructions can be passed to the parser:
 - `_$` acts as a root selector: further parsing will happen in the context of the element identified by this selector
 - `_slice` limits the number of elements to parse, like `Array.prototype.slice(begin[, end])`
 - `_follow` tells Jason to follow a **single link** (fetch new data) & to continue scraping after the new data is received
 - `_paginate` tells Jason to paginate (fetch & scrape new data) & to merge the new values in the current context, here **multiple links** can be selected to scrape in parallel multiple pages

##### Parse helpers

The following syntax specifies how to extract a value:

```
[property name]: [selector] ? [matcher] < [extractor] | [filter]
```

For instance:

```js
...
"repos": [".repo-list-item h3 > a ? text(crawler) < attr(title) | trim"]
...
```

Will extract a "repos" array of values from the links identified by the ".repo-list-item h3 > a" selector, matching only the ones containing the text "crawler". The values will be retrieved from the "title" attribute of each link and will be trimmed.

**Matchers**:

- `text(regexString)`
- `html(regexString)`
- `attr(attributeName,regexString)`
- `slice(begin,end)`

They are used to test an element in order to decide whether to include/discard it from parsing.
If not specified, Jason includes every element.

**Extractors**:

- `text([optionalStaticText])` (by default)
- `html()`
- `attr(attributeName)`
- `regex(regexString)`
- `date(inputFormat,outputFormat)` (parses a date with [moment](https://www.npmjs.com/package/moment))
- `uuid()` (generates a uuid v1 with [uuid](https://www.npmjs.com/package/uuid))
- `count()` (counts the number of elements matching the selector, needs an array schema definition)

**Filters**:

- `trim`
- `single-space`
- `lowercase`
- `uppercase`
- `json-parse` (to parse JSON, like [JSON-LD](https://json-ld.org/))

### Transformers

| Name | Description | Options |
| --- |---| --- |
| `stdout` | Writes the results to stdout | `[encoding="utf8"]` |
| `json-file` | Writes the results to a JSON file | `path` & `[encoding="utf8"]` |
| `csv-file` | Writes the results to a CSV file using [csv-stringify](http://csv.adaltas.com/stringify/) | `csv`: same as [csv-stringify](http://csv.adaltas.com/stringify/) + `path`, `[encoding='utf8']` and `[append=false]` (whether to append the results to an existing file or not) |
| `download-file` | Downloads files to a given folder using [axios](https://github.com/mzabriskie/axios) | `[baseURL]`, `[parseKey]`, `[folder='.']`, `[namePattern='{name}']`, `[maxSizeInMb=1]` & `[concurrency=1]`
| `email` | Sends the results by email using [nodemailer](https://github.com/nodemailer/nodemailer/) | Same as [nodemailer](https://github.com/nodemailer/nodemailer/), split between the `smtp` and `message` options |

Jason supports a single transformer or an array of transformers:

```js
{
  ...
  "transform": [{
    "json-file": {
      "path": "./github-repos.json"
    }
  }, {
    "csv-file": {
      "path": "./github-repos.csv"
    }
  }]
}
```

### ⛏ Bulk processing

Scraping parameters can be defined in a CSV file and applied to configure the processors:

```js
{
  "bulk": {
    "csv-file": {
      "path": "./github-search-queries.csv",
      "csv": {
        "columns": true,
        "delimiter": ","
      }
    }
  },
  "load": {
    "http": {
      "baseURL": "https://github.com",
      "url": "/search?l={language}&o=desc&q={query}&s=stars&type=Repositories",
      "_concurrency": 2
    }
  },
  "parse": {
    "html": {
      "title": "< text(Best {language} repos)",
      "repos": [".repo-list .repo-list-item h3 > a"]
    }
  },
  "transform": {
    "json-file": {
      "path": "./github-repos-{language}.json"
    }
  }
}
```

github-search-queries.csv :

```
language,query
JavaScript,scraper
Python,scraper
```

## ⛏ API

### constructor({ fallbacks = {} } = {})

`fallbacks` defines which processor to use when not explicitly configured (or missing in the config file):
- `load`: 'identity',
- `parse`: 'identity',
- `transform`: 'identity',
- `bulk`: null

The fallbacks change when using the CLI (see `bin/jason-the-miner.js`):
- `load`: 'stdin',
- `parse`: 'html',
- `transform`: 'stdout',
- `bulk`: null

### loadConfig(configFile)

Loads a config from a JSON or JS file.

```js
jason.loadConfig('./harvest-me.json');
```

### harvest({ bulk, load, parse, transform } = {})

Launches the harvesting process:

```js
jason
  .loadConfig('./config.json')
  .then(() => jason.harvest())
  .catch(error => console.error(error));
```

You can pass custom options to temporarily override the current config:

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

To permanently override the current config, you can modify Jason's `config` property:

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

Registers a parse helper in one of the 3 categories: `match`, `extract` or `filter`.
`helper` must be a function.

```js
const url = require('url');

jason.registerHelper({
  category: 'filter',
  name: 'remove-query-params',
  helper: (href = '') => {
    if (!href || href === '#') {
      return href;
    }

    const { protocol, host, pathname } = url.parse(href);

    return `${protocol}//${host}${pathname}`;
  }
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
  constructor({ config }) {
    // receives automatically its config
  }

  /**
   * @param {*} results
   * @return {Promise.<*>}
   */
  run({ results }) {
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

Be aware that loaders **must also implement** the `getConfig()` and `buildLoadOptions({ link })` methods.
Have a look at the source code for more info.

## ⛏ Testing

```shell
$ git clone https://github.com/mawrkus/jason-the-miner.git
$ cd jason-the-miner
$ npm install
$ npm run test
```

## ⛏ Resources

- Web Scraping With Node.js: https://www.smashingmagazine.com/2015/04/web-scraping-with-nodejs/
- X-ray, The next web scraper. See through the <html> noise: https://github.com/lapwinglabs/x-ray
- Simple, lightweight & expressive web scraping with Node.js: https://github.com/eeshi/node-scrapy
- Node.js Scraping Libraries: http://blog.webkid.io/nodejs-scraping-libraries/
- https://www.scrapesentry.com/scraping-wiki/web-scraping-legal-or-illegal/
- http://blog.icreon.us/web-scraping-and-you-a-legal-primer-for-one-of-its-most-useful-tools/
- Web scraping o rastreo de webs y legalidad: https://www.youtube.com/watch?v=EJzugD0l0Bw
- Scraper API blog: https://www.scraperapi.com/blog/

## ⛏ A final note...

Please take these guidelines in consideration when scraping:

- The content being scraped is not copyright protected.
- The act of scraping does not burden the services of the site being scraped.
- The scraper does not violate the Terms of Use of the site being scraped.
- The scraper does not gather sensitive user information.
- The scraped content adheres to fair use standards.
