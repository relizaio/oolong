import { Injectable, NotFoundException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAProductReleaseApi } from '../generated-nest/api';
import { Collection, IdentifierType, PaginatedProductReleaseResponse, ProductRelease } from '../generated-nest/models';
import { ContentLoader } from '../utils/content-loader';

@Injectable()
export class TEAProductReleaseService implements TEAProductReleaseApi {
  private contentLoader: ContentLoader;

  constructor() {
    this.contentLoader = new ContentLoader();
  }

  getCollectionForProductRelease(uuid: string, collectionVersion: number, request: Request): Collection | Promise<Collection> | Observable<Collection> {
    // Handle "latest" as a special case
    if (collectionVersion === 'latest' as any) {
      return this.getLatestCollectionForProductRelease(uuid, request);
    }
    
    const collections = this.contentLoader.loadCollectionsByProductReleaseUuid(uuid);
    console.log('getCollectionForProductRelease called with:', { uuid, collectionVersion, type: typeof collectionVersion });
    console.log('Available collections:', collections.map(c => ({ version: c.version, type: typeof c.version })));
    
    // Convert collectionVersion to number if it's a string (route params are strings by default)
    const versionNumber = typeof collectionVersion === 'string' ? parseInt(collectionVersion, 10) : collectionVersion;
    const collection = collections.find(c => c.version === versionNumber);
    
    if (!collection) {
      throw new NotFoundException(`Collection version ${collectionVersion} not found for product release ${uuid}`);
    }
    
    return collection;
  }

  getCollectionsByProductReleaseId(uuid: string, request: Request): Array<Collection> | Promise<Array<Collection>> | Observable<Array<Collection>> {
    return this.contentLoader.loadCollectionsByProductReleaseUuid(uuid);
  }

  getLatestCollectionForProductRelease(uuid: string, request: Request): Collection | Promise<Collection> | Observable<Collection> {
    const collections = this.contentLoader.loadCollectionsByProductReleaseUuid(uuid);
    
    if (collections.length === 0) {
      throw new NotFoundException(`No collections found for product release ${uuid}`);
    }
    
    // Collections are already sorted by version in ContentLoader
    return collections[collections.length - 1];
  }

  getReleasesByProductId(uuid: string, pageOffset: number, pageSize: number, request: Request): PaginatedProductReleaseResponse | Promise<PaginatedProductReleaseResponse> | Observable<PaginatedProductReleaseResponse> {
    const offset = pageOffset ?? 0;
    const size = pageSize ?? 100;
    
    const releases = this.contentLoader.loadProductReleasesByProductUuid(uuid);
    
    // Calculate pagination
    const totalCount = releases.length;
    const start = offset * size;
    const end = start + size;
    const paginatedReleases = releases.slice(start, end);

    return {
      timestamp: new Date().toISOString(),
      pageStartIndex: offset,
      pageSize: size,
      totalResults: totalCount,
      results: paginatedReleases
    };
  }

  getTeaProductReleaseByUuid(uuid: string, request: Request): ProductRelease | Promise<ProductRelease> | Observable<ProductRelease> {
    const release = this.contentLoader.loadProductReleaseByUuid(uuid);
    
    if (!release) {
      throw new NotFoundException(`Product release with UUID ${uuid} not found`);
    }
    
    return release;
  }

  queryTeaProductReleases(pageOffset: number, pageSize: number, idType: IdentifierType, idValue: string, request: Request): PaginatedProductReleaseResponse | Promise<PaginatedProductReleaseResponse> | Observable<PaginatedProductReleaseResponse> {
    const offset = pageOffset ?? 0;
    const size = pageSize ?? 100;
    
    let releases = this.contentLoader.loadAllProductReleases();

    // Filter by identifier if provided
    if (idType && idValue) {
      releases = releases.filter(release => 
        release.identifiers?.some(id => 
          id.idType === idType && id.idValue === idValue
        )
      );
    }

    // Calculate pagination
    const totalCount = releases.length;
    const start = offset * size;
    const end = start + size;
    const paginatedReleases = releases.slice(start, end);

    return {
      timestamp: new Date().toISOString(),
      pageStartIndex: offset,
      pageSize: size,
      totalResults: totalCount,
      results: paginatedReleases
    };
  }
}
