process.env.DEBUG = 'jason:core,jason:load:*';
const { when } = require('jest-when');
const JasonTheMiner = require('../JasonTheMiner');
const FileReader = require('../processors/loaders/FileReader');

/* eslint-enable class-methods-use-this */

function createJason() {
  const jason = new JasonTheMiner();

  const runSpy = jest.spyOn(FileReader.prototype, 'buildLoadOptions');

  // TODO: jest-when -> call through even when no match?
  when(runSpy)
    .calledWith({ link: 'https://github.com/search?l=JavaScript&o=desc&p=2&q=scraper&s=stars&type=Repositories' })
    .mockReturnValue({ path: 'es/__tests__/fixtures/github-search-p2.html' });

  when(runSpy)
    .calledWith({ link: 'https://github.com/matthewmueller/x-ray' })
    .mockReturnValue({ path: 'es/__tests__/fixtures/github-search-xray.html' });

  when(runSpy)
    .calledWith({ link: 'https://github.com/ecprice/newsdiffs' })
    .mockReturnValue({ path: 'es/__tests__/fixtures/github-search-newsdiffs.html' });

  jason.registerProcessor({
    category: 'load',
    name: 'file',
    processor: FileReader,
  });

  jason.loadConfig('./es/__tests__/fixtures/test-config');

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
              name: 'matthewmueller/x-ray',
              'last-update': '2018-03-01T14:44:53Z',
            },
            {
              name: 'ecprice/newsdiffs',
              'last-update': '2017-11-06T19:38:52Z',
            },
          ],
        },
      });
    });
  });
});
