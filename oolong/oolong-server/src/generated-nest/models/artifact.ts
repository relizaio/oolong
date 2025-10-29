import { ArtifactType } from './artifact-type';
import { ArtifactFormat } from './artifact-format';


/**
 * A security-related document
 */
export interface Artifact { 
  /**
   * A UUID
   */
  uuid?: string;
  /**
   * Artifact name
   */
  name?: string;
  /**
   * Type of artifact
   */
  type?: ArtifactType;
  /**
   * List of component distributions types that this artifact applies to. If absent, the artifact applies to all distributions. 
   */
  distributionTypes?: Array<string>;
  /**
   * List of objects with the same content, but in different formats. The order of the list has no significance. 
   */
  formats?: Array<ArtifactFormat>;
}
export namespace Artifact {
}


