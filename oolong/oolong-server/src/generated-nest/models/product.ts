import { Identifier } from './identifier';


/**
 * A TEA product
 */
export interface Product { 
  /**
   * A UUID
   */
  uuid: string;
  /**
   * Product name
   */
  name: string;
  /**
   * List of identifiers for the product, like TEI, CPE, PURL or other identifiers 
   */
  identifiers: Array<Identifier>;
}

