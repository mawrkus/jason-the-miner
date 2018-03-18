// process.env.DEBUG = 'jason:core,jason:load:*,jason:parse:*';
const JasonTheMiner = require('../JasonTheMiner');
const HttpClient = require('../processors/loaders/HttpClient');

/* eslint-enable class-methods-use-this */

function createJason() {
  const jason = new JasonTheMiner();

  jason.registerProcessor({
    category: 'load',
    name: 'file',
    processor: HttpClient,
  });

  jason.loadConfig('./es/__tests__/fixtures/test-config'); // with cache ;)

  return {
    jason,
  };
}

describe('JasonTheMiner', () => {
  it('should be a class with the following API: registerProcessor(), registerHelper(), loadConfig(), harvest()', () => {
    expect(JasonTheMiner).toBeInstanceOf(Function);
    expect(JasonTheMiner.prototype.registerProcessor).toBeInstanceOf(Function);
    expect(JasonTheMiner.prototype.registerHelper).toBeInstanceOf(Function);
    expect(JasonTheMiner.prototype.loadConfig).toBeInstanceOf(Function);
    expect(JasonTheMiner.prototype.harvest).toBeInstanceOf(Function);
  });

  describe('#harvest({ load, parse, transform })', () => {
    it('should properly load parse & transform', async () => {
      const { jason } = createJason();

      const results = await jason.harvest();

      expect(results).toEqual({
        results: {
          repos: [
            {
              description: 'x-ray - The next web scraper. See through the <html> noise.',
              'last-update': '2018-03-14T23:16:21Z',
              name: 'matthewmueller/x-ray',
              stats: {
                forks: '278',
                stars: '4,239',
                watchers: '104',
              },
              url: 'https://github.com/matthewmueller/x-ray',
            },
            {
              description: 'newsdiffs - Automatic scraper that tracks changes in news articles over time.',
              'last-update': '2017-11-06T19:38:52Z',
              name: 'ecprice/newsdiffs',
              stats: {
                forks: '96',
                stars: '348',
                watchers: '38',
              },
              url: 'https://github.com/ecprice/newsdiffs',
            },
          ],
        },
      });
    });
  });
});
