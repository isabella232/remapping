import buildSourceMapTree from '../../src/build-source-map-tree';
import { DecodedSourceMap, RawSourceMap } from '../../src/types';

describe('buildSourceMapTree', () => {
  const rawMap: RawSourceMap = {
    mappings: 'AAAA',
    names: [],
    sources: ['helloworld.js'],
    sourcesContent: [null],
    version: 3,
  };
  const jsonRawMap = JSON.stringify(rawMap);
  const decodedMap: DecodedSourceMap = {
    ...rawMap,
    mappings: [[[0, 0, 0, 0]]],
  };
  const jsonDecodedMap = JSON.stringify(decodedMap);

  test('parses and decodes a JSON sourcemap', () => {
    const tree = buildSourceMapTree(jsonRawMap, () => null);
    expect(tree.map).toEqual(decodedMap);
  });

  test('parses a Decoded JSON sourcemap', () => {
    const tree = buildSourceMapTree(jsonDecodedMap, () => null);
    expect(tree.map).toEqual(decodedMap);
  });

  test('parses a Raw sourcemap', () => {
    const tree = buildSourceMapTree(rawMap, () => null);
    expect(tree.map).toEqual(decodedMap);
  });

  test('parses a Decoded sourcemap', () => {
    const tree = buildSourceMapTree(decodedMap, () => null);
    expect(tree.map).toEqual(decodedMap);
  });

  test('calls loader for any needed sourcemap', () => {
    const loader = jest.fn(() => null);
    buildSourceMapTree(decodedMap, loader);

    expect(loader).toHaveBeenCalledWith(decodedMap.sources[0]);
    expect(loader.mock.calls.length).toBe(1);
  });

  test('loader cannot be async', () => {
    // tslint:disable-next-line: no-any
    const loader = (): any => Promise.resolve(null);
    expect(() => {
      buildSourceMapTree(decodedMap, loader);
    }).toThrow();
  });

  test('creates OriginalSource if no sourcemap', () => {
    const tree = buildSourceMapTree(decodedMap, () => null);
    expect(tree.sources).toMatchObject([
      {
        filename: 'helloworld.js',
      },
    ]);
  });

  test('creates OriginalSource with sourceContent', () => {
    const tree = buildSourceMapTree(
      {
        ...decodedMap,
        sourcesContent: ['1 + 1'],
      },
      () => null
    );

    expect(tree.sources).toMatchObject([
      {
        content: '1 + 1',
      },
    ]);
  });

  test('creates OriginalSource with null content if no sourceContent', () => {
    const tree = buildSourceMapTree(decodedMap, () => null);
    expect(tree.sources).toMatchObject([
      {
        content: null,
      },
    ]);
  });

  test('creates OriginalSource with null content if no sourcesContent', () => {
    const tree = buildSourceMapTree(
      {
        ...decodedMap,
        sourcesContent: undefined,
      },
      () => null
    );

    expect(tree.sources).toMatchObject([
      {
        content: null,
      },
    ]);
  });

  test('recursively loads sourcemaps', () => {
    const loader = jest.fn();
    loader
      .mockReturnValueOnce({
        ...rawMap,
        sources: ['two.js'],
      })
      .mockReturnValue(null);
    const tree = buildSourceMapTree(decodedMap, loader);

    expect(tree).toMatchObject({
      sources: [
        {
          sources: [
            {
              filename: 'two.js',
            },
          ],
        },
      ],
    });

    expect(loader).toHaveBeenCalledWith(decodedMap.sources[0]);
    expect(loader).toHaveBeenCalledWith('two.js');
    expect(loader.mock.calls.length).toBe(2);
  });

  test('calls loader with sourceRoot joined to source file', () => {
    const loader = jest.fn(() => null);
    buildSourceMapTree(
      {
        ...decodedMap,
        sourceRoot: 'https://foo.com/',
      },
      loader
    );

    expect(loader).toHaveBeenCalledWith('https://foo.com/helloworld.js');
    expect(loader.mock.calls.length).toBe(1);
  });
});