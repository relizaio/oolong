import { Identifier } from './identifier';
import { ComponentRef } from './component-ref';


/**
 * A specific release of a TEA product
 */
export interface ProductRelease { 
  /**
   * A UUID
   */
  uuid: string;
  /**
   * A UUID
   */
  product?: string;
  /**
   * Name of the TEA Product this release belongs to
   */
  productName?: string;
  /**
   * Version number of the product release
   */
  version: string;
  /**
   * Timestamp
   */
  createdDate: string;
  /**
   * Timestamp
   */
  releaseDate?: string;
  /**
   * A flag indicating pre-release (or beta) status. May be disabled after the creation of the release object, but can\'t be enabled after creation of an object. 
   */
  preRelease?: boolean;
  /**
   * List of identifiers for the product release
   */
  identifiers?: Array<Identifier>;
  /**
   * List of component references that compose this product release. A component reference can optionally include the UUID of a specific component release to pin the exact version. 
   */
  components: Array<ComponentRef>;
}

