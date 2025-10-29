import { Collection } from './collection';
import { Release } from './release';


/**
 * A TEA Component Release combined with its latest collection
 */
export interface ComponentReleaseWithCollection { 
  /**
   * The TEA Component Release information
   */
  release: Release;
  /**
   * The latest TEA Collection for this component release
   */
  latestCollection: Collection;
}

