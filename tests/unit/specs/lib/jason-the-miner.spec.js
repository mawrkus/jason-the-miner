// process.env.DEBUG = 'jason:*';

const sinon = require('sinon');
const JasonTheMiner = require('../../../../lib/jason-the-miner');

/* eslint-disable class-methods-use-this, no-unused-vars, jasmine/no-unsafe-spy,
    jasmine/no-spec-dupes */

class TestLoader {
  constructor(config) { this.params = config.params; }
  run(loadConfig) {
    return Promise.resolve('loaded data');
  }
  getRunContext() { return 'loader context'; }
}

class TestParser {
  constructor(config) { this.params = config.params; }
  run(loadedData) {
    return Promise.resolve({ data: ['parsed data'] });
  }
  getRunContext() { return 'parser context'; }
}

class TestTransformer {
  constructor(config) { this.params = config.params; }
  run(parsedData) {
    return Promise.resolve('tranformed data');
  }
}

class TestPaginator {
  constructor(config) { this.params = config.params; }
  run({ loaderRunContext, parserRunContext }) {}
}

function createDummmyProcessor() {
  const DummyProcessor = jasmine.createSpy('test processor');

  DummyProcessor.prototype = {
    run() { return Promise.resolve(); },
    getRunContext() {}
  };

  return DummyProcessor;
}

/* eslint-enable class-methods-use-this, no-unused-vars, jasmine/no-unsafe-spy */

function createJasonTheTester() {
  const jason = new JasonTheMiner();

  jason.registerProcessor({
    category: 'load',
    name: 'test-loader',
    processor: TestLoader
  });

  jason.registerProcessor({
    category: 'parse',
    name: 'test-parser',
    processor: TestParser
  });

  jason.registerProcessor({
    category: 'transform',
    name: 'test-transformer',
    processor: TestTransformer
  });

  jason.registerProcessor({
    category: 'paginate',
    name: 'test-paginator',
    processor: TestPaginator
  });

  return { jason, TestLoader, TestParser, TestTransformer, TestPaginator };
}

const HARVEST_CONFIG = {
  load: {
    'test-loader': {
      params: 'load params'
    }
  },
  parse: {
    'test-parser': {
      params: 'parse params'
    }
  },
  transform: {
    'test-transformer': {
      params: 'transform params'
    }
  },
  paginate: {
    'test-paginator': {
      params: 'paginate params'
    }
  }
};

/* *** */

describe('JasonTheMiner', () => {
  it('should be a class with the following API: registerProcessor(), harvest(), loadConfig(), registerHelper()', () => {
    expect(JasonTheMiner).toEqual(jasmine.any(Function));
    expect(JasonTheMiner.prototype.registerProcessor).toEqual(jasmine.any(Function));
    expect(JasonTheMiner.prototype.registerHelper).toEqual(jasmine.any(Function));
    expect(JasonTheMiner.prototype.loadConfig).toEqual(jasmine.any(Function));
    expect(JasonTheMiner.prototype.harvest).toEqual(jasmine.any(Function));
  });

  it('should expose a public "config" property', () => {
    const jason = new JasonTheMiner();
    expect(jason.config).toEqual(jasmine.any(Object));
  });

  describe('#registerProcessor({ category, name, processor })', () => {
    describe('when registering a "load" processor', () => {
      it('should allow this processor to be used when harvesting', done => {
        const jason = new JasonTheMiner();

        jason.registerProcessor({
          category: 'load',
          name: 'test-loader',
          processor: TestLoader
        });

        spyOn(TestLoader.prototype, 'run').and.callThrough();

        jason.harvest({ load: HARVEST_CONFIG.load })
          .then(() => {
            expect(TestLoader.prototype.run).toHaveBeenCalled();
            done();
          })
          .catch(done.fail);
      });

      describe('when the "load" processor does not implement a "getRunContext" method', () => {
        it('should throw a type error', () => {
          const jason = new JasonTheMiner();

          class InvalidProcessor {
            run() {} // eslint-disable-line
          }

          expect(() => {
            jason.registerProcessor({
              category: 'load',
              name: 'test-loader',
              processor: InvalidProcessor
            });
          }).toThrowError(TypeError);
        });
      });
    });

    describe('when registering a "parse" processor', () => {
      it('should allow this processor to be used when harvesting', done => {
        const jason = new JasonTheMiner();

        jason.registerProcessor({
          category: 'parse',
          name: 'test-parser',
          processor: TestParser
        });

        spyOn(TestParser.prototype, 'run').and.callThrough();

        jason.harvest({ parse: HARVEST_CONFIG.parse })
          .then(() => {
            expect(TestParser.prototype.run).toHaveBeenCalled();
            done();
          })
          .catch(done.fail);
      });

      describe('when the "parse" processor does not implement a "getRunContext" method', () => {
        it('should throw a type error', () => {
          const jason = new JasonTheMiner();

          class InvalidProcessor {
            run() {} // eslint-disable-line
          }

          expect(() => {
            jason.registerProcessor({
              category: 'parse',
              name: 'test-parser',
              processor: InvalidProcessor
            });
          }).toThrowError(TypeError);
        });
      });
    });

    describe('when registering a "transform" processor', () => {
      it('should allow this processor to be used when harvesting', done => {
        const jason = new JasonTheMiner();

        jason.registerProcessor({
          category: 'transform',
          name: 'test-transformer',
          processor: TestTransformer
        });

        spyOn(TestTransformer.prototype, 'run').and.callThrough();

        jason.harvest({ transform: HARVEST_CONFIG.transform })
          .then(() => {
            expect(TestTransformer.prototype.run).toHaveBeenCalled();
            done();
          })
          .catch(done.fail);
      });
    });

    describe('when registering a "paginate" processor', () => {
      it('should allow this processor to be used when harvesting', done => {
        const jason = new JasonTheMiner();

        jason.registerProcessor({
          category: 'paginate',
          name: 'test-paginator',
          processor: TestPaginator
        });

        spyOn(TestPaginator.prototype, 'run').and.callThrough();

        jason.harvest({ paginate: HARVEST_CONFIG.paginate })
          .then(() => {
            expect(TestPaginator.prototype.run).toHaveBeenCalled();
            done();
          })
          .catch(done.fail);
      });
    });

    describe('when trying to register processor that is not a class', () => {
      it('should throw a type error', () => {
        const jason = new JasonTheMiner();

        expect(() => {
          jason.registerProcessor({
            category: 'load',
            name: 'test-loader',
            processor: () => {}
          });
        }).toThrowError(TypeError);
      });
    });

    describe('when trying to register a processor that has no "run" method', () => {
      it('should throw a type error', () => {
        const jason = new JasonTheMiner();

        class InvalidProcessor {}

        expect(() => {
          jason.registerProcessor({
            category: 'load',
            name: 'test-loader',
            processor: InvalidProcessor
          });
        }).toThrowError(TypeError);
      });
    });
  });

  describe('#harvest({ load, parse, paginate, transform })', () => {
    it('should create a new instance of the loader specified in the "load" config', done => {
      const jason = new JasonTheMiner();
      const DummyProcessor = createDummmyProcessor();

      jason.registerProcessor({
        category: 'load',
        name: 'test-loader',
        processor: DummyProcessor
      });

      jason.harvest({ load: HARVEST_CONFIG.load })
        .then(() => {
          expect(DummyProcessor).toHaveBeenCalledWith({ params: 'load params' });
          done();
        })
        .catch(done.fail);
    });

    it('should create a new instance of the parser specified in the "parse" config', done => {
      const jason = new JasonTheMiner();
      const DummyProcessor = createDummmyProcessor();

      jason.registerProcessor({
        category: 'parse',
        name: 'test-parser',
        processor: DummyProcessor
      });

      jason.harvest({ parse: HARVEST_CONFIG.parse })
        .then(() => {
          expect(DummyProcessor).toHaveBeenCalledWith(
            { params: 'parse params' },
            jasmine.objectContaining({})
          );
          done();
        })
        .catch(done.fail);
    });

    it('should create a new instance of the transformer specified in the "transform" config', done => {
      const jason = new JasonTheMiner();
      const DummyProcessor = createDummmyProcessor();

      jason.registerProcessor({
        category: 'transform',
        name: 'test-transformer',
        processor: DummyProcessor
      });

      jason.harvest({ transform: HARVEST_CONFIG.transform })
        .then(() => {
          expect(DummyProcessor).toHaveBeenCalledWith({ params: 'transform params' });
          done();
        })
        .catch(done.fail);
    });

    it('should create a new instance of the paginator specified in the "paginate" config', done => {
      const jason = new JasonTheMiner();
      const DummyProcessor = createDummmyProcessor();

      jason.registerProcessor({
        category: 'paginate',
        name: 'test-paginator',
        processor: DummyProcessor
      });

      jason.harvest({ paginate: HARVEST_CONFIG.paginate })
        .then(() => {
          expect(DummyProcessor).toHaveBeenCalledWith({ params: 'paginate params' });
          done();
        })
        .catch(done.fail);
    });

    it('should use the loader to retrieve data', done => {
      const { jason, TestLoader } = createJasonTheTester();

      spyOn(TestLoader.prototype, 'run').and.callThrough();

      jason.harvest({ load: HARVEST_CONFIG.load })
        .then(() => {
          expect(TestLoader.prototype.run).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('should pass the data retrieved by the loader to the parser', done => {
      const { jason, TestParser } = createJasonTheTester();

      spyOn(TestParser.prototype, 'run').and.callThrough();

      jason.harvest({ load: HARVEST_CONFIG.load, parse: HARVEST_CONFIG.parse })
        .then(() => {
          expect(TestParser.prototype.run).toHaveBeenCalledWith('loaded data');
          done();
        })
        .catch(done.fail);
    });

    it('should pass the parsed results to the transformer', done => {
      const { jason, TestTransformer } = createJasonTheTester();

      spyOn(TestTransformer.prototype, 'run').and.callThrough();

      jason.harvest({
        load: HARVEST_CONFIG.load,
        parse: HARVEST_CONFIG.parse,
        transform: HARVEST_CONFIG.transform
      })
        .then(() => {
          expect(TestTransformer.prototype.run).toHaveBeenCalledWith({ data: ['parsed data'] });
          done();
        })
        .catch(done.fail);
    });

    describe('when using pagination', () => {
      it('should pass the loader & parser contexts to the paginator', done => {
        const { jason, TestPaginator } = createJasonTheTester();

        spyOn(TestPaginator.prototype, 'run');

        jason.harvest({
          load: HARVEST_CONFIG.load,
          parse: HARVEST_CONFIG.parse,
          transform: HARVEST_CONFIG.transform,
          paginate: HARVEST_CONFIG.paginate
        })
          .then(() => {
            expect(TestPaginator.prototype.run).toHaveBeenCalledWith({
              loaderRunContext: 'loader context',
              parserRunContext: 'parser context'
            });
            done();
          })
          .catch(done.fail);
      });

      describe('when the paginator returns new run configs', () => {
        it('should use those configs to generate a new batch of loadings', done => {
          const { jason, TestLoader, TestPaginator } = createJasonTheTester();

          const paginatorStub = sinon.stub(TestPaginator.prototype, 'run');

          TestPaginator.prototype.run.onFirstCall().returns({
            runConfigs: ['next config #1', 'next config #2'],
            concurrency: 2
          });

          TestPaginator.prototype.run.onSecondCall().returns(null);

          spyOn(TestLoader.prototype, 'run').and.callThrough();

          jason.harvest({
            load: HARVEST_CONFIG.load,
            parse: HARVEST_CONFIG.parse,
            transform: HARVEST_CONFIG.transform,
            paginate: HARVEST_CONFIG.paginate
          })
            .then(() => {
              expect(TestLoader.prototype.run).toHaveBeenCalledWith('next config #1');
              expect(TestLoader.prototype.run).toHaveBeenCalledWith('next config #2');
              paginatorStub.restore();
              done();
            })
            .catch(done.fail);
        });

        it('should concatenate all the parsed results & pass them to the transformer', done => {
          const {
            jason,
            TestLoader, TestParser, TestPaginator, TestTransformer
          } = createJasonTheTester();

          const paginatorStub = sinon.stub(TestPaginator.prototype, 'run');

          TestPaginator.prototype.run.onFirstCall().returns({
            runConfigs: ['next config #1', 'next config #2'],
            concurrency: 2
          });

          TestPaginator.prototype.run.onSecondCall().returns(null);

          const loaderStub = sinon.stub(TestLoader.prototype, 'run');

          TestLoader.prototype.run
            .withArgs(undefined)
            .returns(Promise.resolve('loaded data'));

          TestLoader.prototype.run
            .withArgs('next config #1')
            .returns(Promise.resolve('loaded data #1'));

          TestLoader.prototype.run
            .withArgs('next config #2')
            .returns(Promise.resolve('loaded data #2'));

          const parserStub = sinon.stub(TestParser.prototype, 'run');

          TestParser.prototype.run
            .withArgs('loaded data')
            .returns(Promise.resolve({ data: ['parsed data'] }));

          TestParser.prototype.run
            .withArgs('loaded data #1')
            .returns(Promise.resolve({ data: ['parsed data #1'] }));

          TestParser.prototype.run
            .withArgs('loaded data #2')
            .returns(Promise.resolve({ data: ['parsed data #2'] }));

          spyOn(TestTransformer.prototype, 'run');

          jason.harvest({
            load: HARVEST_CONFIG.load,
            parse: HARVEST_CONFIG.parse,
            transform: HARVEST_CONFIG.transform,
            paginate: HARVEST_CONFIG.paginate
          })
            .then(() => {
              expect(TestTransformer.prototype.run).toHaveBeenCalledWith({
                data: ['parsed data', 'parsed data #1', 'parsed data #2']
              });

              paginatorStub.restore();
              loaderStub.restore();
              parserStub.restore();

              done();
            })
            .catch(done.fail);
        });

        describe('whenever a new loading fails', () => {
          it('should resolve the failure to an error object, preventing the whole pagination to' +
          ' fail', done => {
            const {
              jason,
              TestLoader, TestParser, TestPaginator, TestTransformer
            } = createJasonTheTester();

            const paginatorStub = sinon.stub(TestPaginator.prototype, 'run');

            TestPaginator.prototype.run.onFirstCall().returns({
              runConfigs: ['next config #1', 'next config #2'],
              concurrency: 2
            });

            TestPaginator.prototype.run.onSecondCall().returns(null);

            const loaderStub = sinon.stub(TestLoader.prototype, 'run');

            TestLoader.prototype.run
              .withArgs(undefined)
              .returns(Promise.resolve('loaded data'));

            const loadError = new Error();

            TestLoader.prototype.run
              .withArgs('next config #1')
              .returns(Promise.reject(loadError));

            TestLoader.prototype.run
              .withArgs('next config #2')
              .returns(Promise.resolve('loaded data #2'));

            const parserStub = sinon.stub(TestParser.prototype, 'run');

            TestParser.prototype.run
              .withArgs('loaded data')
              .returns(Promise.resolve({ data: ['parsed data'] }));

            TestParser.prototype.run
              .withArgs('loaded data #1')
              .returns(Promise.resolve({ data: ['parsed data #1'] }));

            TestParser.prototype.run
              .withArgs('loaded data #2')
              .returns(Promise.resolve({ data: ['parsed data #2'] }));

            spyOn(TestTransformer.prototype, 'run');

            jason.harvest({
              load: HARVEST_CONFIG.load,
              parse: HARVEST_CONFIG.parse,
              transform: HARVEST_CONFIG.transform,
              paginate: HARVEST_CONFIG.paginate
            })
              .then(() => {
                expect(TestTransformer.prototype.run).toHaveBeenCalledWith({
                  data: ['parsed data', undefined, 'parsed data #2'],
                  _errors: [loadError]
                });

                paginatorStub.restore();
                loaderStub.restore();
                parserStub.restore();

                done();
              })
              .catch(done.fail);
          });
        });
      });
    });
  });

  describe('#registerHelper({ category, name, helper })', () => {
    describe('when registering a parse extractor', () => {
      it('should pass this new helper to the "parse" processor when it is created', done => {
        const jason = new JasonTheMiner();
        const DummyProcessor = createDummmyProcessor();
        const testHelper = () => {};

        jason.registerProcessor({
          category: 'parse',
          name: 'test-parser',
          processor: DummyProcessor
        });

        jason.registerHelper({
          category: 'extract',
          name: 'test-helper',
          helper: testHelper
        });

        jason.harvest({ parse: HARVEST_CONFIG.parse })
          .then(() => {
            const helpers = DummyProcessor.calls.argsFor(0)[1];
            expect(helpers.extract['test-helper']).toBe(testHelper);
            done();
          })
          .catch(done.fail);
      });
    });

    describe('when registering a parse filter', () => {
      it('should pass this new helper to the "parse" processor when it is created', done => {
        const jason = new JasonTheMiner();
        const DummyProcessor = createDummmyProcessor();
        const testHelper = () => {};

        jason.registerProcessor({
          category: 'parse',
          name: 'test-parser',
          processor: DummyProcessor
        });

        jason.registerHelper({
          category: 'filter',
          name: 'test-helper',
          helper: testHelper
        });

        jason.harvest({ parse: HARVEST_CONFIG.parse })
          .then(() => {
            const helpers = DummyProcessor.calls.argsFor(0)[1];
            expect(helpers.filter['test-helper']).toBe(testHelper);
            done();
          })
          .catch(done.fail);
      });
    });

    describe('when trying to register a helper that is not a function', () => {
      it('should throw a type error', () => {
        const jason = new JasonTheMiner();

        expect(() => {
          jason.registerHelper({
            category: 'extract',
            name: 'test-helper',
            helper: {}
          });
        }).toThrowError(TypeError);
      });
    });
  });

  describe('#loadConfig(configPath)', () => {
    it('should load the 4 configurations ("load", "parse", "transform", "paginate") from the file' +
    ' passed as parameter', done => {
      const { jason } = createJasonTheTester();

      jason.loadConfig('./tests/unit/fixtures/config.json')
        .then(config => {
          expect(config).toEqual(HARVEST_CONFIG);
          expect(jason.config).toBe(config);
          done();
        })
        .catch(done.fail);
    });

    it('should ignore any other keys present in the config file', done => {
      const { jason } = createJasonTheTester();

      jason.loadConfig('./tests/unit/fixtures/config-ignore.json')
        .then(config => {
          expect(config).toEqual(HARVEST_CONFIG);
          done();
        })
        .catch(done.fail);
    });

    it('should return a rejected promise if the config file cannot be found ', done => {
      const jason = new JasonTheMiner();

      jason.loadConfig('ghost.json')
        .then(done.fail)
        .catch(done);
    });
  });
});
