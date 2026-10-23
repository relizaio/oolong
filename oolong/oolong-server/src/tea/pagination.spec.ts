import { TeaException } from './errors';
import {
  assertPageTokenSecret,
  parseIdFilter,
  readToken,
  resolvePage,
  signToken,
} from './pagination';

describe('PAGE_TOKEN_SECRET', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.PAGE_TOKEN_SECRET;
  const previousFallback = process.env.PAGE_TOKEN_DEV_FALLBACK;

  afterEach(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousSecret === undefined) delete process.env.PAGE_TOKEN_SECRET;
    else process.env.PAGE_TOKEN_SECRET = previousSecret;
    if (previousFallback === undefined) delete process.env.PAGE_TOKEN_DEV_FALLBACK;
    else process.env.PAGE_TOKEN_DEV_FALLBACK = previousFallback;
  });

  it('requires a secret unless the development fallback is opted in', () => {
    delete process.env.PAGE_TOKEN_SECRET;
    delete process.env.PAGE_TOKEN_DEV_FALLBACK;
    process.env.NODE_ENV = 'test';
    expect(() => assertPageTokenSecret()).toThrow(/PAGE_TOKEN_SECRET/);

    process.env.PAGE_TOKEN_DEV_FALLBACK = 'true';
    const open = signToken({
      op: 'products',
      parent: '',
      idType: '',
      idValue: '',
      sortField: 'name',
      sortOrder: 'asc',
      pageSize: 25,
      index: 0,
      contentRevision: 'static',
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
      contentRevision: 'static',
    });
    expect(readToken(bound).index).toBe(0);
    delete process.env.PAGE_TOKEN_SECRET;
    expect(() => readToken(bound)).toThrow(
      /INVALID_PAGE_TOKEN|malformed page token/,
    );
  });

  it('rejects production without a secret even when the development fallback is set', () => {
    process.env.NODE_ENV = 'production';
    process.env.PAGE_TOKEN_DEV_FALLBACK = 'true';
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
      contentRevision: 'static',
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

describe('resolvePage content revision', () => {
  it('binds new tokens to the active revision and rejects stale tokens', () => {
    const first = resolvePage({}, 'products', '', ['name'], 'name', 'rev-a');
    expect(first.contentRevision).toBe('rev-a');
    const token = signToken({ ...first, index: 1 });
    const continued = resolvePage(
      { pageToken: token },
      'products',
      '',
      ['name'],
      'name',
      'rev-a',
    );
    expect(continued.index).toBe(1);
    expect(() =>
      resolvePage(
        { pageToken: token },
        'products',
        '',
        ['name'],
        'name',
        'rev-b',
      ),
    ).toThrow(TeaException);
  });
});
