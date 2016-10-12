const HtmlParser = require('../../../lib/processors/parse/html');
const debug = require('debug')('jason:parse:mixcloud');

class MixCloudStatsParser {

  constructor(config, helpers) {
    debug('Creating an HtmlParser instance...');
    this._htmlParser = new HtmlParser(config, helpers);
    debug('MixCloudStatsParser instance created.');
  }

  getRunContext() {
    return this._htmlParser.getRunContext();
  }

  run(html) {
    return this._htmlParser.run(html).then(results => {
      const plays = results.map(curr => curr.plays).join('/');
      const subject = `🎧 Mixcloud stats → ${plays}`;
      const listItems = results.reduce((acc, mix) => `${acc}<li>${mix.name} → <b>${mix.plays}</b> plays (${mix.pubDate})</li>`, '');
      const body = `<ol>${listItems}</ol>`;
      return { subject, body };
    });
  }

}

module.exports = MixCloudStatsParser;
