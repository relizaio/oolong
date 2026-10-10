import * as fs from 'fs';
import * as path from 'path';
import { ContentStore } from './content-store';

const fixtures = path.resolve(__dirname, '../../../fixtures/tea-1.0.0');
const sample = path.resolve(__dirname, '../../../sample_content');

describe('ContentStore', () => {
  it('loads the 1.0.0 fixtures without writing them', () => {
    const marker = path.join(fixtures, 'products', 'alpha', 'product.yaml');
    const before = fs.readFileSync(marker);
    const store = new ContentStore(fixtures);
    expect(store.products.size).toBe(5);
    expect(store.productReleases.size).toBe(3);
    expect(store.components.size).toBe(2);
    expect(store.componentReleases.size).toBe(3);
    const release = store.productReleases.get(
      '22222222-2222-4222-8222-222222222222',
    );
    expect(release?.version).toBe('1.0.0');
    const latest = store.productReleaseView(release!).latestCollection;
    expect(latest.version).toBe(2);
    expect(latest.uuid).toBe(release?.uuid);
    expect(latest.artifacts[0].version).toBe(2);
    expect(latest.artifacts[0].formats[0].mediaType).toBe(
      'application/vnd.cyclonedx+json',
    );
    expect(fs.readFileSync(marker).equals(before)).toBe(true);
    const bare = store.productReleases.get(
      '22222222-2222-4222-8222-222222222223',
    );
    expect(store.productReleaseView(bare!).latestCollection.artifacts).toEqual(
      [],
    );
    expect(
      fs.existsSync(
        path.join(
          fixtures,
          'products',
          'alpha',
          'releases',
          '1.1.0',
          'collections',
        ),
      ),
    ).toBe(false);
  });

  it('loads the migrated sample content', () => {
    const store = new ContentStore(sample);
    expect(store.products.size).toBe(1);
    const release = store.productReleases.get(
      '9485fbc9-aa7d-4c26-95c9-d5a8ccb1c073',
    );
    expect(release?.identifiers?.[0].idValue).toBe(
      'tei://demo.rearmhq.com/asin/B09D6HR559',
    );
    const componentRelease = store.componentReleases.get(
      '7a7fa4da-bf9b-478f-b934-2fe9e0fc317c',
    );
    const latest = store.componentReleaseView(
      componentRelease!,
    ).latestCollection;
    expect(latest.version).toBe(2);
    expect(latest.artifacts[0].uuid).toBe(
      '173cedd7-fabb-4d3a-9315-7d7465d236b6',
    );
    expect(latest.artifacts[0].formats[0].mediaType).toBe(
      'application/vnd.cyclonedx+json',
    );
    expect(latest.artifacts[0].version).toBe(1);
  });
});
