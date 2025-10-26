import { Identifier } from './identifier';
import { Checksum } from './checksum';


export interface ReleaseDistribution { 
  /**
   * Unique identifier for the distribution type.
   */
  distributionType?: string;
  /**
   * Free-text description of the distribution.
   */
  description?: string;
  /**
   * List of identifiers specific to this distribution.
   */
  identifiers?: Array<Identifier>;
  /**
   * Direct download URL for the distribution.
   */
  url?: string;
  /**
   * Direct download URL for the distribution\'s external signature.
   */
  signatureUrl?: string;
  /**
   * List of checksums for the distribution.
   */
  checksums?: Array<Checksum>;
}

