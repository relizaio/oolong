import { CollectionUpdateReasonType } from './collection-update-reason-type';


/**
 * Reason for the update to the TEA collection
 */
export interface CollectionUpdateReason { 
  /**
   * Type of update reason.
   */
  type?: CollectionUpdateReasonType;
  /**
   * Free text description
   */
  comment?: string;
}
export namespace CollectionUpdateReason {
}


