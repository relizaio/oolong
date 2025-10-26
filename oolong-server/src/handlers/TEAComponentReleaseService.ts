import { Injectable, NotFoundException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAComponentReleaseApi } from '../generated-nest/api';
import { Collection, ComponentReleaseWithCollection } from '../generated-nest/models';
import { ContentLoader } from '../utils/content-loader';

@Injectable()
export class TEAComponentReleaseService implements TEAComponentReleaseApi {
  private contentLoader: ContentLoader;

  constructor() {
    this.contentLoader = new ContentLoader();
  }

  getCollection(uuid: string, collectionVersion: number, request: Request): Collection | Promise<Collection> | Observable<Collection> {
    const collection = this.contentLoader.loadCollectionByReleaseUuidAndVersion(uuid, collectionVersion);
    
    if (!collection) {
      throw new NotFoundException(`Collection version ${collectionVersion} not found for component release ${uuid}`);
    }
    
    return collection;
  }

  getCollectionsByReleaseId(uuid: string, request: Request): Array<Collection> | Promise<Array<Collection>> | Observable<Array<Collection>> {
    return this.contentLoader.loadCollectionsByComponentReleaseUuid(uuid);
  }

  getComponentReleaseById(uuid: string, request: Request): ComponentReleaseWithCollection | Promise<ComponentReleaseWithCollection> | Observable<ComponentReleaseWithCollection> {
    const release = this.contentLoader.loadComponentReleaseByUuid(uuid);
    
    if (!release) {
      throw new NotFoundException(`Component release with UUID ${uuid} not found`);
    }
    
    const collections = this.contentLoader.loadCollectionsByComponentReleaseUuid(uuid);
    
    if (collections.length === 0) {
      throw new NotFoundException(`No collections found for component release ${uuid}`);
    }
    
    // Get the latest collection (collections are sorted by version)
    const latestCollection = collections[collections.length - 1];
    
    return {
      release,
      latestCollection
    };
  }

  getLatestCollection(uuid: string, request: Request): Collection | Promise<Collection> | Observable<Collection> {
    const collections = this.contentLoader.loadCollectionsByComponentReleaseUuid(uuid);
    
    if (collections.length === 0) {
      throw new NotFoundException(`No collections found for component release ${uuid}`);
    }
    
    // Collections are already sorted by version in ContentLoader
    return collections[collections.length - 1];
  }
}
