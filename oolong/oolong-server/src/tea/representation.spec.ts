import { TeaException } from './errors';
import type { ArtifactFormat } from './content-store';
import {
  assertAdvertisedVersion,
  selectFormat,
  sendRedirect,
} from './representation';

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

describe('sendRedirect', () => {
  function response() {
    const headers = new Map<string, string>();
    return {
      statusCode: 0,
      headers,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      setHeader(name: string, value: string) {
        headers.set(name, value);
      },
      end() {
        return this;
      },
    };
  }

  it('issues 302 for http and https publisher URLs', () => {
    const httpRes = response();
    sendRedirect(httpRes as never, 'http://example.invalid/sbom.json');
    expect(httpRes.statusCode).toBe(302);
    expect(httpRes.headers.get('Location')).toBe(
      'http://example.invalid/sbom.json',
    );
    const httpsRes = response();
    sendRedirect(httpsRes as never, 'https://example.invalid/sbom.json');
    expect(httpsRes.headers.get('Location')).toBe(
      'https://example.invalid/sbom.json',
    );
  });

  it('rejects non-http redirect schemes', () => {
    expect(() => sendRedirect(response() as never, 'file:///etc/passwd')).toThrow(
      TeaException,
    );
    expect(() =>
      sendRedirect(response() as never, 'javascript:alert(1)'),
    ).toThrow(TeaException);
  });
});
