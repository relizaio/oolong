import { Observable } from 'rxjs';
import { TEADiscoveryApi } from '../api';
import { DiscoveryInfo } from '../models';
export declare class TEADiscoveryApiController {
    private readonly tEADiscoveryApi;
    constructor(tEADiscoveryApi: TEADiscoveryApi);
    discoveryByTei(tei: string, request: Request): Array<DiscoveryInfo> | Promise<Array<DiscoveryInfo>> | Observable<Array<DiscoveryInfo>>;
}
