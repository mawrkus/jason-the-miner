const HtmlParser = require('../../../lib/processors/parsers/html');
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
    return this._htmlParser.run(html).then(({ mixes }) => {
      const plays = mixes.map(curr => curr.plays).join('/');
      const subject = `🎧 Mixcloud stats → ${plays}`;
      const listItems = mixes.reduce((acc, mix) => `${acc}<li>${mix.name} → <b>${mix.plays}</b> plays (${mix.pubDate})</li>`, '');
      const body = `<ol>${listItems}</ol>`;
      return { subject, body };
    });
  }

}

module.exports = MixCloudStatsParser;
