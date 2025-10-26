import { Identifier } from './identifier';
import { ReleaseDistribution } from './release-distribution';


/**
 * A TEA Component Release
 */
export interface Release { 
  /**
   * A UUID
   */
  uuid: string;
  /**
   * A UUID
   */
  component?: string;
  /**
   * Name of the TEA Component this release belongs to
   */
  componentName?: string;
  /**
   * Version number
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
   * List of identifiers for the component
   */
  identifiers?: Array<Identifier>;
  /**
   * List of different formats of this component release
   */
  distributions?: Array<ReleaseDistribution>;
}

