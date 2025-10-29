

/**
 * TEA server information including URL, versions, and optional priority
 */
export interface TeaServerInfo { 
  /**
   * Root URL of the TEA server for this TEI without trailing slash
   */
  rootUrl: string;
  /**
   * Supported TEA API versions at this server without v prefix
   */
  versions: Array<string>;
  /**
   * Optional priority for this server (0.0 to 1.0, where 1.0 is highest priority)
   */
  priority?: number;
}

