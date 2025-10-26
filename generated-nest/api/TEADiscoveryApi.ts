import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { DiscoveryInfo,  } from '../models';


@Injectable()
export abstract class TEADiscoveryApi {

  abstract discoveryByTei(tei: string,  request: Request): Array<DiscoveryInfo> | Promise<Array<DiscoveryInfo>> | Observable<Array<DiscoveryInfo>>;

} 