import { TeaServerInfo } from './tea-server-info';
export interface DiscoveryInfo {
    productReleaseUuid: string;
    servers: Array<TeaServerInfo>;
}
