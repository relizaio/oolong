import { ChecksumType } from './checksum-type';


export interface Checksum { 
  /**
   * Checksum algorithm
   */
  algType?: ChecksumType;
  /**
   * Checksum value
   */
  algValue?: string;
}
export namespace Checksum {
}


