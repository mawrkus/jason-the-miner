# Jason the Miner
 [![npm](https://img.shields.io/npm/l/jason-the-miner.svg)](https://www.npmjs.org/package/jason-the-miner) [![npm](https://img.shields.io/npm/v/jason-the-miner.svg)](https://www.npmjs.org/package/jason-the-miner)
![Node version](https://img.shields.io/node/v/jason-the-miner.svg?style=flat-square)

Harvesting data at the `<html>` mine... Jason the Miner, a versatile Web scraper for Node.js.

## ⛏ Features

- **Composable:** via a modular architecture based on pluggable processors. The output of one processor feeds the input of the next one. There are 3 processor categories:
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

...and have a look at the "demos" folder.

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
$ jason-the-miner -c github-config.json
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
$ curl https://github.com/search?q=scraper&l=JavaScript&type=Repositories&s=stars&o=desc | jason-the-miner -c github-config.json > github-repos.json
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

Jason the Miner comes with 3 built-in loaders:

| Name | Description | Options |
| --- |---| --- |
| `http` | Uses [axios](https://github.com/mzabriskie/axios) as HTTP client | All [axios](https://github.com/mzabriskie/axios) request options + `[_concurrency=1]` (to limit the number of concurrent requests when following/paginating) &  `[_cache]` (to cache responses on the file system) |
| `file` | Reads the content of a file | `path`, `[stream=false]`, `[encoding="utf8"]` & `[_concurrency=1]` (to limit the number of concurrent requests when paginating) |
| `stdin` | Reads the content from the standard input | `[encoding="utf8"]` |

For example, an HTTP load config with pagination (pages 1 -> 3) where responses will be cached in the "tests/http-cache" folder:

```js
...
"load": {
  "http": {
    "baseURL": "https://github.com",
    "url": "/search?l=JavaScript&o=desc&q=scraper&s=stars&type=Repositories&p={1,3}",
    "_concurrency": 2,
    "_cache": {
      "folder": "tests/http-cache"
    }
  }
}
...
```

Check the [demos](demos/configs) folder for more examples.

### Parsers

Currently, Jason the Miner comes with a single built-in parser:

| Name | Description | Options |
| --- |---| --- |
|`html`|Parses HTML, built with [Cheerio](https://github.com/cheeriojs/cheerio)|A parse schema|

#### Schema definition

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

A schema is a plain object that recursively defines:
 - the names of the values/collection of values that you want to extract: "title" (single value), "metas" (object), "stylesheets" (collection of values), "repos" (collection of objects)
 - how to extract them: `[selector] ? [matcher] < [extractor] | [filter]` (check "Parse helpers" below)

Additional instructions can be passed to the parser:
 - `_$` acts as a root selector: further parsing will happen in the context of the element identified by this selector
 - `_slice` limits the number of elements to parse, like `String.prototype.slice(begin[, end])`
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

Jason has 4 built-in element **matchers**:

- `text(regexString)`
- `html(regexString)`
- `attr(attributeName,regexString)`
- `slice(begin,end)`

They are used to test an element in order to decide whether to include/discard it from parsing.
If not specified, Jason includes every element.

6 built-in text **extractors**:

- `text([optionalStaticText])` (by default)
- `html()`
- `attr(attributeName)`
- `regex(regexString)`
- `date(inputFormat,outputFormat)` (parses a date with [moment](https://www.npmjs.com/package/moment))
- `uuid()` (generates a uuid v1 with [uuid](https://www.npmjs.com/package/uuid))

and 4 built-in text **filters**:

- `trim`
- `single-space`
- `lowercase`
- `uppercase`

### Transformers

| Name | Description | Options |
| --- |---| --- |
| `stdout` | Writes the results to stdout | `[encoding="utf8"]` |
| `json-file` | Writes the results to a JSON file | `path` & `[encoding="utf8"]` |
| `csv-file` | Writes the results to a CSV file using [csv-stringify](http://csv.adaltas.com/stringify/) | Same as [csv-stringify](http://csv.adaltas.com/stringify/) + `_path`, `[_encoding='utf8']` and `[_append=false]` (whether to append the results to an existing file or not) |
| `download-file` | Downloads files to a given folder using [axios](https://github.com/mzabriskie/axios) | `[baseURL]`, `[parseKey]`, `[folder='.']`, `[namePattern='{name}']`, `[maxSizeInMb=1]` & `[concurrency=1]`
| `email` | Sends the results by email using [nodemailer](https://github.com/nodemailer/nodemailer/) | Same as [nodemailer](https://github.com/nodemailer/nodemailer/), splitted into the `smtp` and `message` options |

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
  constructor(config) {
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

Be aware that loaders **must also implement** the `getConfig()`, `buildPaginationLinks()` and `buildLoadOptions({ link })` methods.
Have a look at the source code for more info.

## ⛏ Testing

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

- The content being scraped is not copyright protected.
- The act of scraping does not burden the services of the site being scraped.
- The scraper does not violate the Terms of Use of the site being scraped.
- The scraper does not gather sensitive user information.
- The scraped content adheres to fair use standards.
