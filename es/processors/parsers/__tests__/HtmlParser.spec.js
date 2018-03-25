// process.env.DEBUG = 'jason:parse:html';
const HtmlParser = require('../HtmlParser');
const defaultParserHelpers = require('../helpers');

function createParser() {
  return new HtmlParser({}, defaultParserHelpers);
}

describe('HtmlParser', () => {
  it('should be a class with the following API: run({ data: )', () => {
    expect(HtmlParser).toBeInstanceOf(Function);
    expect(HtmlParser.prototype.run).toBeInstanceOf(Function);
  });

  describe('#run({ data, schema })', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
          <title>Tops</title>
        </head>
        <body>
          <div class="top top-artists">
            <h1 class="title artists-title">Best artists</h1>
            <ul class="list">
              <li class="list-item"><a href="http://the-stooges.com/">The Stooges</a></li>
              <li class="list-item"><a href="http://primal-scream.com/">Primal Scream</a></li>
              <li class="list-item"><a href="http://john-frusciante.com/">John Frusciante</a></li>
            </ul>
            <p class="note">March 2018</p>
            <p>
              Suggested by <a class="editor" href="/mawrkus">mawrkus</a>
            </p>
          </div>
          <div class="top top-records">
            <h1 class="title records-title">Best records</h1>
            <ul class="list">
              <li class="list-item"><a href="http://island-life.com/">Island Life</a></li>
              <li class="list-item"><a href="http://homeland.com/">Homeland</a></li>
              <li class="list-item"><a href="http://navega.com/">Navega</a></li>
            </ul>
            <p class="note">February 2018</p>
          </div>
          <div class="top top-songs">
            <h1 class="title">Other tops</h1>
            <h2 class="title songs-title">Best songs</h2>
            <ul class="list">
              <li>
                <span><a href="#1" data-url="http://rose-life.com/"> La vie en rose (radio edit)   </a></span>
                <span>
                  <img class="img" src="http://rose-life.com/cover.png" alt="Rose cover" />
                  <a class="more" href="http://rose-life.com/pics">See more</a>
                </span>
              </li>
              <li>
                <span><a href="#" data-url="http://dreamland.com/">       Dream (radio edit)</a></span>
                <span>
                  <img class="img" src="http://dreamland.com/cover.png" alt="Dream cover" />
                  <a class="more" href="http://dreamland.com/pics">See more</a>
                </span>
              </li>
              <li>
                <span><a href="#3" data-url="http://luavega.com/">Lua       </a></span>
                <span>
                  <img class="img" src="http://luavega.com/cover.png" alt="Lua cover" />
                  <a class="more" href="http://luavega.com/pics">See more</a>
                </span>
              </li>
            </ul>
            <div>
              <a class="next-page" href="/best-songs/2">Page 2</a>
              <a class="next-page" href="/best-songs/3">Page 3</a>
              <a class="next-page" href="   ">Broken link</a>
              <a class="next-page" href="/best-songs/4">Page 4</a>
            </div>
          </div>
        </body>
      </html>
    `;

    it('should return a promise', () => {
      const parser = createParser();
      expect(parser.run({ data: '', schema: {} })).toBeInstanceOf(Promise);
    });

    describe('when the schema has a property made of a string', () => {
      describe('and identifies a single element', () => {
        it('should return the parsed value of this element', async () => {
          const parser = createParser();

          const schema = {
            title: '.title',
          };

          const { result } = await parser.run({ data: html, schema });

          expect(result).toEqual({
            title: 'Best artists',
          });
        });
      });

      describe('and identifies multiple elements', () => {
        it('should return the parsed value of the first element', async () => {
          const parser = createParser();

          const schema = {
            artist: '.list-item',
          };

          const { result } = await parser.run({ data: html, schema });

          expect(result).toEqual({
            artist: 'The Stooges',
          });
        });
      });

      describe('and does not identify an element', () => {
        it('should return null as parsed value', async () => {
          const parser = createParser();

          const schema = {
            copyright: '.copyright',
          };

          const { result } = await parser.run({ data: html, schema });

          expect(result).toEqual({
            copyright: null,
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

          const { result } = await parser.run({ data: html, schema });

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

          const { result } = await parser.run({ data: html, schema });

          expect(result).toEqual({
            top: {
              title: 'Best records',
              updated: 'February 2018',
            },
          });
        });

        describe('and a property of this object is made of an empty string', () => {
          it('should return an object with the correct parsed values, using the root element', async () => {
            const parser = createParser();

            const schema = {
              top: {
                _$: '.top-records .title',
                title: '',
              },
            };

            const { result } = await parser.run({ data: html, schema });

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
              items: ['.list-item a'],
            };

            const { result } = await parser.run({ data: html, schema });

            expect(result).toEqual({
              items: [
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
                items: [{
                  name: '.list-item a',
                }],
              };

              const expectedError = new Error('No root element selector defined in array schema (path="items,0")!');

              await expect(parser.run({ data: html, schema })).rejects.toEqual(expectedError);
            });
          });

          describe('and a root element selector is defined', () => {
            it('should return an aray of objects with the correct parsed values, using the root element', async () => {
              const parser = createParser();

              const schema = {
                items: [{
                  _$: '.list-item',
                  name: 'a',
                }],
              };

              const { result } = await parser.run({ data: html, schema });

              expect(result).toEqual({
                items: [
                  { name: 'The Stooges' },
                  { name: 'Primal Scream' },
                  { name: 'John Frusciante' },
                  { name: 'Island Life' },
                  { name: 'Homeland' },
                  { name: 'Navega' },
                ],
              });
            });

            describe('and a slice parameter is defined', () => {
              it('should return an aray of objects with the correct parsed values, using the root element', async () => {
                const parser = createParser();

                const schema = {
                  items: [{
                    _$: '.list-item',
                    _slice: '2,4',
                    name: 'a',
                  }],
                  artists: [{
                    _$: '.top-artists .list-item',
                    _slice: '1',
                    name: 'a',
                  }],
                };

                const { result } = await parser.run({ data: html, schema });

                expect(result).toEqual({
                  items: [
                    { name: 'John Frusciante' },
                    { name: 'Island Life' },
                  ],
                  artists: [
                    { name: 'Primal Scream' },
                    { name: 'John Frusciante' },
                  ],
                });
              });
            });
          });
        });

        describe('and the element is neither a string nor an object', () => {
          it('should throw an error', async () => {
            const parser = createParser();

            const schema = {
              items: [
                ['.list-item a'],
              ],
            };

            const expectedError = new Error('Array schemas can only contain a string or an object (path="items,0")!');

            await expect(parser.run({ data: html, schema })).rejects.toEqual(expectedError);
          });
        });
      });

      describe('and the array has more than one element', () => {
        it('should return an array of parsed values, using only the first element', async () => {
          const parser = createParser();

          const schema = {
            records: [
              '.top-records .list-item a',
              '.top-artists .list-item a',
            ],
          };

          const { result } = await parser.run({ data: html, schema });

          expect(result).toEqual({
            records: [
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
          items: [{
            _$: '.list-item',
            artist: {
              name: 'a',
            },
          }],
          metas: {
            _$: '.note',
            updated: '',
          },
        };

        const { result } = await parser.run({ data: html, schema });

        expect(result).toEqual({
          title: 'Best artists',
          items: [
            { artist: { name: 'The Stooges' } },
            { artist: { name: 'Primal Scream' } },
            { artist: { name: 'John Frusciante' } },
          ],
          metas: {
            updated: 'March 2018',
          },
        });
      });
    });

    describe('when the schema contains "follow" definitions', () => {
      it('should return the partial parsed values and the correct "follow" configuration', async () => {
        const parser = createParser();

        const schema = {
          _$: '.top-artists',
          title: '.title',
          items: [{
            _$: '.list-item a',
            artist: {
              _follow: {
                _link: '',
                biography: 'p.biography',
              },
              name: '',
            },
          }],
          metas: {
            _$: '.note',
            updated: '',
          },
          _follow: {
            _link: '.editor',
            editor: {
              name: 'h3.editor-name',
              posts: '.posts',
            },
          },
        };

        const { result, follows } = await parser.run({ data: html, schema });

        expect(result).toEqual({
          title: 'Best artists',
          items: [
            { artist: { name: 'The Stooges' } },
            { artist: { name: 'Primal Scream' } },
            { artist: { name: 'John Frusciante' } },
          ],
          metas: {
            updated: 'March 2018',
          },
        });

        expect(follows).toEqual([
          {
            link: 'http://the-stooges.com/',
            parsedPath: ['items', 0, 'artist'],
            schemaPath: ['items', 0, 'artist', '_follow'],
          },
          {
            link: 'http://primal-scream.com/',
            parsedPath: ['items', 1, 'artist'],
            schemaPath: ['items', 0, 'artist', '_follow'],
          },
          {
            link: 'http://john-frusciante.com/',
            parsedPath: ['items', 2, 'artist'],
            schemaPath: ['items', 0, 'artist', '_follow'],
          },
          {
            link: '/mawrkus',
            parsedPath: [],
            schemaPath: ['_follow'],
          },
        ]);
      });
    });

    describe('when the schema contains references to matchers, extractors and filters', () => {
      it('should return the expected parsed results', async () => {
        const parser = createParser();

        const schema = {
          _$: '.top ? attr(class,songs)',
          title: '.title ? html(^Best) | uppercase',
          songs: [{
            _$: 'li ? slice(1,3)',
            title: 'span < text | trim',
            url: 'a < attr(data-url)',
          }],
          anchors: ['a ? attr(href,^#\\d) < attr(href)'],
          note: '< text(Jason, you\'re fantastic!)',
        };

        const { result } = await parser.run({ data: html, schema });

        expect(result).toEqual({
          title: 'BEST SONGS',
          songs: [
            {
              title: 'Dream (radio edit)',
              url: 'http://dreamland.com/',
            },
            {
              title: 'Lua',
              url: 'http://luavega.com/',
            },
          ],
          anchors: ['#1', '#3'],
          note: 'Jason, you\'re fantastic!',
        });
      });
    });

    describe('when the schema contains "paginate" definitions', () => {
      it('should return the partial parsed values and the correct "paginate" configuration', async () => {
        const parser = createParser();

        const schema = {
          _$: '.top-songs',
          title: '.songs-title',
          songs: [{
            _$: 'li',
            title: 'a[data-url] < regex(([^(]+)) | trim',
            images: [{
              _$: 'span:last-child',
              name: 'img < attr(alt)',
              src: 'img < attr(src)',
              _paginate: {
                link: '.more',
                depth: 2,
              },
            }],
          }],
          _paginate: {
            link: '.next-page',
            slice: '0,3',
            depth: 1,
          },
        };

        const { result, paginates } = await parser.run({ data: html, schema });

        expect(result).toEqual({
          title: 'Best songs',
          songs: [
            {
              title: 'La vie en rose',
              images: [{ name: 'Rose cover', src: 'http://rose-life.com/cover.png' }],
            },
            {
              title: 'Dream',
              images: [{ name: 'Dream cover', src: 'http://dreamland.com/cover.png' }],
            },
            {
              title: 'Lua',
              images: [{ name: 'Lua cover', src: 'http://luavega.com/cover.png' }],
            },
          ],
        });

        expect(paginates).toEqual([
          {
            link: 'http://rose-life.com/pics',
            depth: 2,
            parsedPath: ['songs', 0, 'images'],
            schemaPath: ['songs', 0, 'images', 0],
          },
          {
            link: 'http://dreamland.com/pics',
            depth: 2,
            parsedPath: ['songs', 1, 'images'],
            schemaPath: ['songs', 0, 'images', 0],
          },
          {
            link: 'http://luavega.com/pics',
            depth: 2,
            parsedPath: ['songs', 2, 'images'],
            schemaPath: ['songs', 0, 'images', 0],
          },
          {
            link: '/best-songs/2',
            depth: 1,
            parsedPath: [],
            schemaPath: [],
          },
          {
            link: '/best-songs/3',
            depth: 1,
            parsedPath: [],
            schemaPath: [],
          },
        ]);
      });
    });
  });
});
