const HtmlParser = require('../../../es/processors/parsers/HtmlParser');
const debug = require('debug')('jason:parse:mixcloud');

class MixCloudStatsParser {
  /**
   * @param  {Object} schema The schema definition
   * @param  {Object} helpers A set of parse helpers
   */
  constructor(schema, helpers) {
    debug('Creating an HtmlParser instance...');
    this._htmlParser = new HtmlParser(schema, helpers);
    debug('MixCloudStatsParser instance created.');
  }

  /**
   * @param {string} html
   * @param {Object} [customSchema]
   * @return {Promise.<Object>}
   */
  async run(html, customSchema) {
    const { result } = await this._htmlParser.run(html, customSchema);
    const { mixes } = result;
    const plays = mixes.map(curr => curr.plays).join('/');

    // yes, we will send an email
    const subject = `🎧 Mixcloud stats → ${plays}`;
    const listItems = mixes.reduce((acc, mix) => `${acc}<li>${mix.name} → <b>${mix.stats.plays}</b> plays (${mix.stats.published})</li>`, '');
    const body = `<ol>${listItems}</ol>`;

    debug('Done parsing, ready to send email!');

    return {
      result: {
        subject,
        body,
      },
    };
  }
}

module.exports = MixCloudStatsParser;
