import { TeaServerInfo } from './tea-server-info';


/**
 * Discovery information for a TEI
 */
export interface DiscoveryInfo { 
  /**
   * A UUID
   */
  productReleaseUuid: string;
  /**
   * Array of TEA server information
   */
  servers: Array<TeaServerInfo>;
}

