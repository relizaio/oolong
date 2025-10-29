import { Observable } from 'rxjs';
import { TEAComponentReleaseApi } from '../api';
import { Collection, ComponentReleaseWithCollection } from '../models';
export declare class TEAComponentReleaseApiController {
    private readonly tEAComponentReleaseApi;
    constructor(tEAComponentReleaseApi: TEAComponentReleaseApi);
    getCollection(uuid: string, collectionVersion: number, request: Request): Collection | Promise<Collection> | Observable<Collection>;
    getCollectionsByReleaseId(uuid: string, request: Request): Array<Collection> | Promise<Array<Collection>> | Observable<Array<Collection>>;
    getComponentReleaseById(uuid: string, request: Request): ComponentReleaseWithCollection | Promise<ComponentReleaseWithCollection> | Observable<ComponentReleaseWithCollection>;
    getLatestCollection(uuid: string, request: Request): Collection | Promise<Collection> | Observable<Collection>;
}
