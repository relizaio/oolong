import { assertAdvertisedVersion } from './representation';

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
