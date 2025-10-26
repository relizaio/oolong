import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEADiscoveryApi } from '../generated-nest/api';
import { DiscoveryInfo } from '../generated-nest/models';

@Injectable()
export class TEADiscoveryService implements TEADiscoveryApi {
  discoveryByTei(tei: string, request: Request): Array<DiscoveryInfo> | Promise<Array<DiscoveryInfo>> | Observable<Array<DiscoveryInfo>> {
    throw new Error('Method not implemented.');
  }
}
