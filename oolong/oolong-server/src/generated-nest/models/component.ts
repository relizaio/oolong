import { Identifier } from './identifier';


/**
 * A TEA component
 */
export interface Component { 
  /**
   * A UUID
   */
  uuid: string;
  /**
   * Component name
   */
  name: string;
  /**
   * List of identifiers for the component
   */
  identifiers: Array<Identifier>;
}

