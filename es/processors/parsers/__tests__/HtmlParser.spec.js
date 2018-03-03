// process.env.DEBUG = 'jason:parse:html';

const HtmlParser = require('../HtmlParser');
const defaultParserHelpers = require('../helpers');

function createParser() {
  return new HtmlParser({}, defaultParserHelpers);
}

describe('HtmlParser', () => {
  it('should be a class with the following API: run()', () => {
    expect(HtmlParser).toBeInstanceOf(Function);
    expect(HtmlParser.prototype.run).toBeInstanceOf(Function);
  });

  describe('#run(html, schema)', () => {
    const html = `
      <html>
        <body>
          <div class="container">
            <h1 class="title">Best records</h1>
            <ul id="list">
              <li class="list-item"><a href="http://the-stooges.com/">The Stooges</a></li>
              <li class="list-item"><a href="http://primal-scream.com/">Primal Scream</a></li>
              <li class="list-item"><a href="http://john-frusciante.com/">John Frusciante</a></li>
            </ul>
            <p id="note">March 2018</p>
          </div>
        </body>
      </html>
    `;

    it('should return a promise', () => {
      const parser = createParser();
      expect(parser.run('', {})).toBeInstanceOf(Promise);
    });

    describe('when the schema is made of a single string', () => {
      describe('and identifies a single element', () => {
        it('should return a single string', async () => {
          const parser = createParser();

          const schema = {
            title: '.title',
          };

          const { result } = await parser.run(html, schema);

          expect(result).toEqual({
            title: 'Best records',
          });
        });
      });

      describe('and identifies multiple elements', () => {
        it('should return an array of strings', async () => {
          const parser = createParser();

          const schema = {
            links: '.list-item',
          };

          const { result } = await parser.run(html, schema);

          expect(result).toEqual({
            links: ['The Stooges', 'Primal Scream', 'John Frusciante'],
          });
        });
      });
    });

    describe('when the schema is made of an object', () => {
      describe('and each value is identified by its own selector', () => {
        it('should return the correct object', async () => {
          const parser = createParser();

          const schema = {
            top: {
              title: '.title',
              updated: '#note',
            },
          };

          const { result } = await parser.run(html, schema);

          expect(result).toEqual({
            top: {
              title: 'Best records',
              updated: 'March 2018',
            },
          });
        });
      });

      describe('and a root element selector is defined', () => {
        it('should return the correct object', async () => {
          const parser = createParser();

          const schema = {
            top: {
              _$: '#container',
              title: '.title',
              updated: '#note',
            },
          };

          const { result } = await parser.run(html, schema);

          expect(result).toEqual({
            top: {
              title: 'Best records',
              updated: 'March 2018',
            },
          });
        });
      });
    });

    describe('when the schema is made of an array', () => {
      describe('and each value is identified by its own selector', () => {
        fit('should return the correct array of values', async () => {
          const parser = createParser();

          const schema = {
            links: [{
              artist: '.list-item a',
            }],
          };

          const { result } = await parser.run(html, schema);

          expect(result).toEqual({
            links: [
              { artist: 'The Stooges' },
              { artist: 'Primal Scream' },
              { artist: 'John Frusciante' },
            ],
          });
        });
      });

      describe('and a root element selector is defined', () => {
        it('should return the correct array of values', async () => {
          const parser = createParser();

          const schema = {
            links: [{
              _$: '.list-item',
              artist: 'a',
            }],
          };

          const { result } = await parser.run(html, schema);

          expect(result).toEqual({
            links: [
              { artist: 'The Stooges' },
              { artist: 'Primal Scream' },
              { artist: 'John Frusciante' },
            ],
          });
        });
      });
    });

    describe('when the schema is a mix of the above', () => {
      it('should return the expected result', async () => {
        const parser = createParser();

        const schema = {
          _$: '#container',
          title: '.title',
          links: [{
            _$: '.list-item',
            artist: 'a',
          }],
        };

        const { result } = await parser.run(html, schema);

        expect(result).toEqual({
          title: 'Best records',
          links: [
            { artist: 'The Stooges' },
            { artist: 'Primal Scream' },
            { artist: 'John Frusciante' },
          ],
        });
      });
    });
  });
});
