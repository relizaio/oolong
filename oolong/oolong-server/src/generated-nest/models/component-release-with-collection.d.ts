import { Collection } from './collection';
import { Release } from './release';
export interface ComponentReleaseWithCollection {
    release: Release;
    latestCollection: Collection;
}
