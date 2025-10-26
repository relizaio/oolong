import { Observable } from 'rxjs';
import { DiscoveryInfo } from '../models';
export declare abstract class TEADiscoveryApi {
    abstract discoveryByTei(tei: string, request: Request): Array<DiscoveryInfo> | Promise<Array<DiscoveryInfo>> | Observable<Array<DiscoveryInfo>>;
}
