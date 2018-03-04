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
          <div class="top-artists">
            <h1 class="title">Best artists</h1>
            <ul id="list">
              <li class="list-item"><a href="http://the-stooges.com/">The Stooges</a></li>
              <li class="list-item"><a href="http://primal-scream.com/">Primal Scream</a></li>
              <li class="list-item"><a href="http://john-frusciante.com/">John Frusciante</a></li>
            </ul>
            <p class="note">March 2018</p>
          </div>
          <div class="top-records">
            <h1 class="title">Best records</h1>
            <ul id="list">
              <li class="list-item"><a href="http://island-life.com/">Island Life</a></li>
              <li class="list-item"><a href="http://homeland.com/">Homeland</a></li>
              <li class="list-item"><a href="http://navega.com/">Navega</a></li>
            </ul>
            <p class="note">February 2018</p>
          </div>
        </body>
      </html>
    `;

    it('should return a promise', () => {
      const parser = createParser();
      expect(parser.run('', {})).toBeInstanceOf(Promise);
    });

    describe('when the schema has a property made of a string', () => {
      describe('and identifies a single element', () => {
        it('should return the parsed value of this element', async () => {
          const parser = createParser();

          const schema = {
            title: '.title',
          };

          const { result } = await parser.run(html, schema);

          expect(result).toEqual({
            title: 'Best artists',
          });
        });
      });

      describe('and identifies multiple elements', () => {
        it('should return the parsed value of the first element', async () => {
          const parser = createParser();

          const schema = {
            links: '.list-item',
          };

          const { result } = await parser.run(html, schema);

          expect(result).toEqual({
            links: 'The Stooges',
          });
        });
      });
    });

    describe('when the schema has a property made of an object', () => {
      describe('and no root element selector is defined', () => {
        it('should return an object with the correct parsed values', async () => {
          const parser = createParser();

          const schema = {
            top: {
              title: '.title',
              updated: '.note',
            },
          };

          const { result } = await parser.run(html, schema);

          expect(result).toEqual({
            top: {
              title: 'Best artists',
              updated: 'March 2018',
            },
          });
        });
      });

      describe('and a root element selector is defined', () => {
        it('should return an object with the correct parsed values, using the root element', async () => {
          const parser = createParser();

          const schema = {
            top: {
              _$: '.top-records',
              title: '.title',
              updated: '.note',
            },
          };

          const { result } = await parser.run(html, schema);

          expect(result).toEqual({
            top: {
              title: 'Best records',
              updated: 'February 2018',
            },
          });
        });

        describe('when a schema property is made of an empty string', () => {
          it('should return an object with the correct parsed values, using the root element', async () => {
            const parser = createParser();

            const schema = {
              top: {
                _$: '.top-records .title',
                title: '',
              },
            };

            const { result } = await parser.run(html, schema);

            expect(result).toEqual({
              top: {
                title: 'Best records',
              },
            });
          });
        });
      });
    });

    describe('when the schema is made of an array', () => {
      describe('and the array has a single element', () => {
        describe('and the element is a string', () => {
          it('should return an array of parsed values', async () => {
            const parser = createParser();

            const schema = {
              links: ['.list-item a'],
            };

            const { result } = await parser.run(html, schema);

            expect(result).toEqual({
              links: [
                'The Stooges',
                'Primal Scream',
                'John Frusciante',
                'Island Life',
                'Homeland',
                'Navega',
              ],
            });
          });
        });

        describe('and the element is an object', () => {
          describe('and no root element selector is defined', () => {
            // TODO: allow if it has a single key, as a short notation?
            it('should throw an error', async () => {
              const parser = createParser();

              const schema = {
                links: [{
                  name: '.list-item a',
                }],
              };

              const expectedError = new Error('No root element selector defined in array schema (path="links,0")!');

              await expect(parser.run(html, schema)).rejects.toEqual(expectedError);
            });
          });

          describe('and a root element selector is defined', () => {
            it('should return an aray of objects with the correct parsed values, using the root element', async () => {
              const parser = createParser();

              const schema = {
                links: [{
                  _$: '.list-item',
                  name: 'a',
                }],
              };

              const { result } = await parser.run(html, schema);

              expect(result).toEqual({
                links: [
                  { name: 'The Stooges' },
                  { name: 'Primal Scream' },
                  { name: 'John Frusciante' },
                  { name: 'Island Life' },
                  { name: 'Homeland' },
                  { name: 'Navega' },
                ],
              });
            });
          });
        });

        describe('and the element is neither a string nor an object', () => {
          it('should throw an error', async () => {
            const parser = createParser();

            const schema = {
              links: [
                ['.list-item a'],
              ],
            };

            const expectedError = new Error('Array schemas can only contain a string or an object (path="links,0")!');

            await expect(parser.run(html, schema)).rejects.toEqual(expectedError);
          });
        });
      });

      describe('and the array has more than one element', () => {
        it('should return an array of parsed values, using only the first element', async () => {
          const parser = createParser();

          const schema = {
            links: [
              '.top-records .list-item a',
              '.top-artists .list-item a',
            ],
          };

          const { result } = await parser.run(html, schema);

          expect(result).toEqual({
            links: [
              'Island Life',
              'Homeland',
              'Navega',
            ],
          });
        });
      });
    });

    describe('when the schema is a mix of the above', () => {
      it('should return the expected parsed result', async () => {
        const parser = createParser();

        const schema = {
          _$: '.top-artists',
          title: '.title',
          links: [{
            _$: '.list-item',
            artist: 'a',
          }],
          metas: {
            updated: '.note',
          },
        };

        const { result } = await parser.run(html, schema);

        expect(result).toEqual({
          title: 'Best artists',
          links: [
            { artist: 'The Stooges' },
            { artist: 'Primal Scream' },
            { artist: 'John Frusciante' },
          ],
          metas: {
            updated: 'March 2018',
          },
        });
      });
    });

    describe('when the schema contains a "follow" defintion', () => {
      
    });
  });
});
