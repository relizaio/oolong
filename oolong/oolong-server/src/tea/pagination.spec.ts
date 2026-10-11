import {
  assertPageTokenSecret,
  parseIdFilter,
  readToken,
  signToken,
} from './pagination';

describe('PAGE_TOKEN_SECRET', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.PAGE_TOKEN_SECRET;

  afterEach(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousSecret === undefined) delete process.env.PAGE_TOKEN_SECRET;
    else process.env.PAGE_TOKEN_SECRET = previousSecret;
  });

  it('allows the development fallback and honors an explicit secret', () => {
    delete process.env.PAGE_TOKEN_SECRET;
    process.env.NODE_ENV = 'test';
    const open = signToken({
      op: 'products',
      parent: '',
      idType: '',
      idValue: '',
      sortField: 'name',
      sortOrder: 'asc',
      pageSize: 25,
      index: 0,
    });
    expect(readToken(open).op).toBe('products');

    process.env.PAGE_TOKEN_SECRET = 'configured-for-test';
    const bound = signToken({
      op: 'products',
      parent: '',
      idType: '',
      idValue: '',
      sortField: 'name',
      sortOrder: 'asc',
      pageSize: 25,
      index: 0,
    });
    expect(readToken(bound).index).toBe(0);
    delete process.env.PAGE_TOKEN_SECRET;
    expect(() => readToken(bound)).toThrow(
      /INVALID_PAGE_TOKEN|malformed page token/,
    );
  });

  it('rejects production startup without a secret and accepts one when set', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.PAGE_TOKEN_SECRET;
    expect(() => assertPageTokenSecret()).toThrow(/PAGE_TOKEN_SECRET/);
    process.env.PAGE_TOKEN_SECRET = 'production-configured';
    expect(assertPageTokenSecret().length).toBeGreaterThan(0);
    const token = signToken({
      op: 'products',
      parent: '',
      idType: '',
      idValue: '',
      sortField: 'name',
      sortOrder: 'asc',
      pageSize: 25,
      index: 1,
    });
    expect(readToken(token).index).toBe(1);
  });
});

describe('parseIdFilter', () => {
  it('accepts a type-only filter and still rejects a value without a type', () => {
    expect(parseIdFilter(undefined, undefined)).toBeUndefined();
    expect(parseIdFilter('PURL', undefined)).toEqual({
      idType: 'PURL',
      idValue: '',
    });
    expect(parseIdFilter('CPE', 'cpe:2.3:a:oolong:fixture-widget')).toEqual({
      idType: 'CPE',
      idValue: 'cpe:2.3:a:oolong:fixture-widget',
    });
    expect(() => parseIdFilter(undefined, 'pkg:generic/example')).toThrow(
      /idValue requires idType/,
    );
    expect(() => parseIdFilter('PURL', '')).toThrow(/invalid idValue/);
    expect(() => parseIdFilter('NOT_A_TYPE', undefined)).toThrow(
      /invalid idType/,
    );
  });
});
