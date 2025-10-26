import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEADiscoveryApi } from '../generated-nest/api';
import { DiscoveryInfo } from '../generated-nest/models';
import { ContentLoader } from '../utils/content-loader';

@Injectable()
export class TEADiscoveryService implements TEADiscoveryApi {
  private contentLoader: ContentLoader;

  constructor() {
    this.contentLoader = new ContentLoader();
  }

  discoveryByTei(tei: string, request: Request): Array<DiscoveryInfo> | Promise<Array<DiscoveryInfo>> | Observable<Array<DiscoveryInfo>> {
    // URL decode the TEI (NestJS should handle this automatically, but be safe)
    const decodedTei = decodeURIComponent(tei);
    console.log('Discovery query for TEI:', decodedTei);
    
    // Load all product releases
    const allReleases = this.contentLoader.loadAllProductReleases();
    console.log('Total product releases:', allReleases.length);
    
    // Find product releases that have this TEI in their identifiers
    const matchingReleases = allReleases.filter(release => 
      release.identifiers?.some(id => 
        id.idType === 'TEI' && id.idValue === decodedTei
      )
    );
    
    console.log('Matching releases:', matchingReleases.map(r => r.uuid));
    
    // Get server info from environment (same as .well-known/tea)
    const apiVersion = process.env.API_VERSION || 'v0.2.0-beta.2';
    const version = apiVersion.startsWith('v') ? apiVersion.substring(1) : apiVersion;
    const serverHost = process.env.SERVER_HOST || 'https://demo.rearmhq.com/tea';
    
    // Create discovery info for each matching release
    const discoveryInfos: DiscoveryInfo[] = matchingReleases.map(release => ({
      productReleaseUuid: release.uuid,
      servers: [
        {
          rootUrl: serverHost,
          versions: [version],
          priority: 1.0
        }
      ]
    }));
    
    return discoveryInfos;
  }
}
