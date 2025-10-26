import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAComponentReleaseApi } from '../generated-nest/api';
import { Collection, ComponentReleaseWithCollection } from '../generated-nest/models';

@Injectable()
export class TEAComponentReleaseService implements TEAComponentReleaseApi {
  getCollection(uuid: string, collectionVersion: number, request: Request): Collection | Promise<Collection> | Observable<Collection> {
    throw new Error('Method not implemented.');
  }

  getCollectionsByReleaseId(uuid: string, request: Request): Array<Collection> | Promise<Array<Collection>> | Observable<Array<Collection>> {
    throw new Error('Method not implemented.');
  }

  getComponentReleaseById(uuid: string, request: Request): ComponentReleaseWithCollection | Promise<ComponentReleaseWithCollection> | Observable<ComponentReleaseWithCollection> {
    throw new Error('Method not implemented.');
  }

  getLatestCollection(uuid: string, request: Request): Collection | Promise<Collection> | Observable<Collection> {
    throw new Error('Method not implemented.');
  }
}
