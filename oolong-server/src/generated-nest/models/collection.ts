import { CollectionBelongsToType } from './collection-belongs-to-type';
import { CollectionUpdateReason } from './collection-update-reason';
import { Artifact } from './artifact';


/**
 * A collection of security-related documents
 */
export interface Collection { 
  /**
   * A UUID
   */
  uuid?: string;
  /**
   * TEA Collection version, incremented each time its content changes. Versions start with 1. 
   */
  version?: number;
  /**
   * Timestamp
   */
  date?: string;
  /**
   * Indicates whether this collection belongs to a Component Release or a Product Release
   */
  belongsTo?: CollectionBelongsToType;
  /**
   * Reason for the update/release of the TEA Collection object.
   */
  updateReason?: CollectionUpdateReason;
  /**
   * List of TEA artifact objects.
   */
  artifacts?: Array<Artifact>;
}
export namespace Collection {
}


