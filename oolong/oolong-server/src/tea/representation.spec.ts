import { TeaException } from './errors';
import type { ArtifactFormat } from './content-store';
import { assertAdvertisedVersion, selectFormat } from './representation';

function formats(types: string[]): ArtifactFormat[] {
  return types.map((mediaType) => ({ mediaType }));
}

describe('advertised version', () => {
  const previous = process.env.API_VERSION;

  afterEach(() => {
    if (previous === undefined) delete process.env.API_VERSION;
    else process.env.API_VERSION = previous;
  });

  it('accepts 1.0.0 and rejects every other value', () => {
    delete process.env.API_VERSION;
    expect(() => assertAdvertisedVersion()).not.toThrow();
    process.env.API_VERSION = 'v1.0.0';
    expect(() => assertAdvertisedVersion()).not.toThrow();
    process.env.API_VERSION = 'v0.2.0-beta.2';
    expect(() => assertAdvertisedVersion()).toThrow(/1\.0\.0/);
  });
});

describe('selectFormat', () => {
  const jsonXml = formats(['application/json', 'application/xml']);

  it('uses explicit mediaType and ignores Accept', () => {
    const chosen = selectFormat(
      jsonXml,
      'application/xml',
      'application/json;q=1',
    );
    expect(chosen.mediaType).toBe('application/xml');
  });

  it('honors q=0 on a specific type over a wildcard', () => {
    const chosen = selectFormat(jsonXml, undefined, 'application/xml;q=0, */*');
    expect(chosen.mediaType).toBe('application/json');
  });

  it('returns 406 when every matching range has q=0', () => {
    expect(() =>
      selectFormat(
        [{ mediaType: 'application/xml' }],
        undefined,
        'application/xml;q=0, */*',
      ),
    ).toThrow(TeaException);
    try {
      selectFormat(
        [{ mediaType: 'application/xml' }],
        undefined,
        'application/xml;q=0, */*',
      );
    } catch (error) {
      expect(error).toMatchObject({
        status: 406,
        code: 'NO_ACCEPTABLE_FORMAT',
      });
    }
  });

  it('prefers a higher-quality acceptable format', () => {
    const chosen = selectFormat(
      jsonXml,
      undefined,
      'application/json;q=0.8, application/xml;q=0.2',
    );
    expect(chosen.mediaType).toBe('application/json');
  });

  it('keeps the first format at equal quality', () => {
    const chosen = selectFormat(jsonXml, undefined, '*/*');
    expect(chosen.mediaType).toBe('application/json');
  });
});
