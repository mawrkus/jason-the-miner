// process.env.DEBUG = 'jason:core,jason:load:*,jason:parse:*';
const JasonTheMiner = require('../JasonTheMiner');

async function createJason({ configFile }) {
  const jason = new JasonTheMiner();

  await jason.loadConfig(`./es/__tests__/fixtures/configs/${configFile}`); // with cache ;)

  return {
    jason,
  };
}

describe('JasonTheMiner integration tests', () => {
  describe('when there is neither a "follow" nor a "paginate" definition in the parse schema', () => {
    it('should properly load, parse & return the result', async () => {
      const { jason } = await createJason({ configFile: 'no-follow-no-paginate.json' });

      const results = await jason.harvest();

      expect(results).toEqual({
        results: {
          repos: [{ name: 'matthewmueller/x-ray' }],
        },
      });
    });
  });

  describe('when there is only a "follow" definition in the parse schema', () => {
    it('should properly load, parse & return the result', async () => {
      const { jason } = await createJason({ configFile: 'follow-no-paginate.json' });

      const results = await jason.harvest();

      expect(results).toEqual({
        results: {
          repos: [{
            name: 'matthewmueller/x-ray',
            description: 'x-ray - The next web scraper. See through the <html> noise.',
          }],
        },
      });
    });
  });

  describe('when there is only a "paginate" definition in the parse schema', () => {
    it('should properly load, parse & return the result', async () => {
      const { jason } = await createJason({ configFile: 'no-follow-paginate.json' });

      const results = await jason.harvest();

      expect(results).toEqual({
        results: {
          repos: [{
            name: 'matthewmueller/x-ray',
          }, {
            name: 'ecprice/newsdiffs',
          }],
        },
      });
    });
  });

  describe('when there is a single level of "follow" & paginate" definitions in the parse schema', () => {
    it('should properly load, parse & return the result', async () => {
      const { jason } = await createJason({ configFile: 'follow-paginate-depth-1.json' });

      const results = await jason.harvest();

      expect(results).toEqual({
        results: {
          repos: [{
            name: 'matthewmueller/x-ray',
            description: 'x-ray - The next web scraper. See through the <html> noise.',
          }, {
            name: 'ecprice/newsdiffs',
            description: 'newsdiffs - Automatic scraper that tracks changes in news articles over time.',
          }],
        },
      });
    });
  });

  describe('when there are nested levels of "follow" & paginate" definitions in the parse schema', () => {
    it('should properly load parse & transform', async () => {
      const { jason } = await createJason({ configFile: 'follow-paginate-nested.json' });

      const results = await jason.harvest();

      expect(results).toEqual({
        results: {
          repos: [
            {
              name: 'matthewmueller/x-ray',
              description: 'x-ray - The next web scraper. See through the <html> noise.',
              'open-issues': [
                {
                  desc: 'isUrl module breaks nesting',
                  opened: '2018-03-23T14:54:19Z',
                },
                {
                  desc: 'silently fails if img@src image element doesn\'t exist',
                  opened: '2017-02-12T10:25:40Z',
                },
              ],
            },
            {
              name: 'ecprice/newsdiffs',
              description: 'newsdiffs - Automatic scraper that tracks changes in news articles over time.',
              'open-issues': [
                {
                  desc: 'Docs fail to mention check on robots.txt',
                  opened: '2018-01-14T02:17:14Z',
                },
              ],
            },
          ],
        },
      });
    });
  });
});
