import { Checksum } from './checksum';


/**
 * A security-related document in a specific format
 */
export interface ArtifactFormat { 
  /**
   * The MIME type of the document
   */
  mimeType?: string;
  /**
   * A free text describing the artifact
   */
  description?: string;
  /**
   * Direct download URL for the artifact
   */
  url?: string;
  /**
   * Direct download URL for an external signature of the artifact
   */
  signatureUrl?: string;
  /**
   * List of checksums for the artifact
   */
  checksums?: Array<Checksum>;
}

