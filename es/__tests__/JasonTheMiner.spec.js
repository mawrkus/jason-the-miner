// process.env.DEBUG = 'jason:core,jason:load:*,jason:parse:*';
const JasonTheMiner = require('../JasonTheMiner');

function createAndRegisterProcessors({ jason, names }) {
  /* eslint-disable class-methods-use-this */
  class Loader {
    constructor({ config }) { Loader.config = config || 'default'; }
    async run() { return []; }
    getConfig() { return {}; }
    buildLoadOptions() { return {}; }
  }

  if (names.loader) {
    jason.registerProcessor({
      category: 'load',
      name: names.loader,
      processor: Loader,
    });
  }

  class Parser {
    constructor({ config }) { Parser.config = config || 'default'; }
    async run() { return { result: {}, follows: [], paginates: [] }; }
  }

  if (names.parser) {
    jason.registerProcessor({
      category: 'parse',
      name: names.parser,
      processor: Parser,
    });
  }

  class Transformer {
    constructor({ config }) { Transformer.config = config || 'default'; }
    async run() { return {}; }
  }

  if (names.transformer) {
    jason.registerProcessor({
      category: 'transform',
      name: names.transformer,
      processor: Transformer,
    });
  }

  return { Loader, Parser, Transformer };
}

async function createJason() {
  const fallbacks = {
    load: 'fallback loader',
    parse: 'fallback parser',
    transform: 'fallback transformer',
  };

  const jason = new JasonTheMiner({ fallbacks });

  const {
    Loader: FallBackLoader,
    Parser: FallBackParser,
    Transformer: FallBackTramsformer,
  } = createAndRegisterProcessors({
    jason,
    names: {
      loader: 'fallback loader',
      parser: 'fallback parser',
      transformer: 'fallback transformer',
    },
  });

  return {
    jason,
    FallBackLoader,
    FallBackParser,
    FallBackTramsformer,
  };

  /* eslint-enable class-methods-use-this */
}

describe('JasonTheMiner', () => {
  it('should be a class with the following API: registerProcessor(), registerHelper(), loadConfig(), harvest()', () => {
    expect(JasonTheMiner).toBeInstanceOf(Function);
    expect(JasonTheMiner.prototype.registerProcessor).toBeInstanceOf(Function);
    expect(JasonTheMiner.prototype.registerHelper).toBeInstanceOf(Function);
    expect(JasonTheMiner.prototype.loadConfig).toBeInstanceOf(Function);
    expect(JasonTheMiner.prototype.harvest).toBeInstanceOf(Function);
  });

  describe('#harvest({ bulk, load, parse, transform })', () => {
    describe('when no parameters are passed and when no config has been previously set', () => {
      it('should instantiate fallback processors', async () => {
        const {
          jason,
          FallBackLoader,
          FallBackParser,
          FallBackTramsformer,
        } = await createJason();

        await jason.harvest();

        expect(FallBackLoader.config).toEqual('default');
        expect(FallBackParser.config).toEqual('default');
        expect(FallBackTramsformer.config).toEqual('default');
      });
    });

    describe('when no parameters are passed but a config has been previously set', () => {
      it('should instantiate the processors corresponding to this config', async () => {
        const {
          jason,
          FallBackLoader,
          FallBackParser,
          FallBackTramsformer,
        } = await createJason();

        const {
          Loader,
          Parser,
          Transformer,
        } = createAndRegisterProcessors({
          jason,
          names: {
            loader: 'config loader',
            parser: 'config parser',
            transformer: 'config transformer',
          },
        });

        jason.config.load = { 'config loader': { src: 'config' } };
        jason.config.parse = { 'config parser': { src: 'config' } };
        jason.config.transform = { 'config transformer': { src: 'config' } };

        await jason.harvest();

        expect(FallBackLoader.config).toBeUndefined();
        expect(FallBackParser.config).toBeUndefined();
        expect(FallBackTramsformer.config).toBeUndefined();

        expect(Loader.config).toEqual({ src: 'config' });
        expect(Parser.config).toEqual({ src: 'config' });
        expect(Transformer.config).toEqual({ src: 'config' });
      });
    });

    describe('when configs are passed as parameters', () => {
      it('should instantiate the corresponding processors', async () => {
        const {
          jason,
          FallBackLoader,
          FallBackParser,
          FallBackTramsformer,
        } = await createJason();

        const {
          Loader,
          Parser,
          Transformer,
        } = createAndRegisterProcessors({
          jason,
          names: {
            loader: 'param loader',
            parser: 'param parser',
            transformer: 'param transformer',
          },
        });

        await jason.harvest({
          load: { 'param loader': { src: 'param loader' } },
          parse: { 'param parser': { src: 'param parser' } },
          transform: { 'param transformer': { src: 'param transformer' } },
        });

        expect(FallBackLoader.config).toBeUndefined();
        expect(FallBackParser.config).toBeUndefined();
        expect(FallBackTramsformer.config).toBeUndefined();

        expect(Loader.config).toEqual({ src: 'param loader' });
        expect(Parser.config).toEqual({ src: 'param parser' });
        expect(Transformer.config).toEqual({ src: 'param transformer' });
      });
    });

    describe('when processors specified in the config are unknown', () => {
      it('should instantiate fallback processors instead', async () => {
        const {
          jason,
          FallBackLoader,
          FallBackParser,
          FallBackTramsformer,
        } = await createJason();

        await jason.harvest({
          load: { 'unknown loader': { src: 'unknown loader' } },
          parse: { 'unnown parser': { src: 'unknown parser' } },
          transform: { 'unknown transformer': { src: 'unknown transformer' } },
        });

        expect(FallBackLoader.config).toEqual({ src: 'unknown loader' });
        expect(FallBackParser.config).toEqual({ src: 'unknown parser' });
        expect(FallBackTramsformer.config).toEqual({ src: 'unknown transformer' });
      });
    });

    describe('when the "transform" config is an array', () => {
      it('should instantiate all the corresponding transformers', async () => {
        const { jason } = await createJason();

        const { Transformer: ShapeShifter } = createAndRegisterProcessors({
          jason,
          names: {
            transformer: 'shape-shifter',
          },
        });

        const { Transformer: LiquidChameleon } = createAndRegisterProcessors({
          jason,
          names: {
            transformer: 'liquid-chameleon',
          },
        });

        await jason.harvest({
          transform: [{
            'liquid-chameleon': { colors: 'all' },
          }, {
            'shape-shifter': { triangles: true },
          }],
        });

        expect(ShapeShifter.config).toEqual({ triangles: true });
        expect(LiquidChameleon.config).toEqual({ colors: 'all' });
      });
    });

    describe('when a bulk config is passed/set', () => {
      it('should instantiate the loader defined in it', async () => {
        const { jason } = await createJason();
        const { Loader } = createAndRegisterProcessors({
          jason,
          names: {
            loader: 'bulk loader',
          },
        });

        await jason.harvest({
          bulk: { 'bulk loader': { src: 'bulk loader' } },
        });

        expect(Loader.config).toEqual({ src: 'bulk loader' });
      });
    });
  });
});
