import { IdentifierType } from './identifier-type';


/**
 * An identifier with a specified type
 */
export interface Identifier { 
  /**
   * Type of identifier, e.g. `TEI`, `PURL`, `CPE`
   */
  idType?: IdentifierType;
  /**
   * Identifier value
   */
  idValue?: string;
}
export namespace Identifier {
}


