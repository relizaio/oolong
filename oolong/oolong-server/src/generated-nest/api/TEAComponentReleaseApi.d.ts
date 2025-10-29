import { Observable } from 'rxjs';
import { Collection, ComponentReleaseWithCollection } from '../models';
export declare abstract class TEAComponentReleaseApi {
    abstract getCollection(uuid: string, collectionVersion: number, request: Request): Collection | Promise<Collection> | Observable<Collection>;
    abstract getCollectionsByReleaseId(uuid: string, request: Request): Array<Collection> | Promise<Array<Collection>> | Observable<Array<Collection>>;
    abstract getComponentReleaseById(uuid: string, request: Request): ComponentReleaseWithCollection | Promise<ComponentReleaseWithCollection> | Observable<ComponentReleaseWithCollection>;
    abstract getLatestCollection(uuid: string, request: Request): Collection | Promise<Collection> | Observable<Collection>;
}
