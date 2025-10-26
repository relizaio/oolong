import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAProductReleaseApi } from '../../../generated-nest/api';
import { Collection, IdentifierType, PaginatedProductReleaseResponse, ProductRelease } from '../../../generated-nest/models';

@Injectable()
export class TEAProductReleaseService implements TEAProductReleaseApi {
  getCollectionForProductRelease(uuid: string, collectionVersion: number, request: Request): Collection | Promise<Collection> | Observable<Collection> {
    throw new Error('Method not implemented.');
  }

  getCollectionsByProductReleaseId(uuid: string, request: Request): Array<Collection> | Promise<Array<Collection>> | Observable<Array<Collection>> {
    throw new Error('Method not implemented.');
  }

  getLatestCollectionForProductRelease(uuid: string, request: Request): Collection | Promise<Collection> | Observable<Collection> {
    throw new Error('Method not implemented.');
  }

  getReleasesByProductId(uuid: string, pageOffset: number, pageSize: number, request: Request): PaginatedProductReleaseResponse | Promise<PaginatedProductReleaseResponse> | Observable<PaginatedProductReleaseResponse> {
    throw new Error('Method not implemented.');
  }

  getTeaProductReleaseByUuid(uuid: string, request: Request): ProductRelease | Promise<ProductRelease> | Observable<ProductRelease> {
    throw new Error('Method not implemented.');
  }

  queryTeaProductReleases(pageOffset: number, pageSize: number, idType: IdentifierType, idValue: string, request: Request): PaginatedProductReleaseResponse | Promise<PaginatedProductReleaseResponse> | Observable<PaginatedProductReleaseResponse> {
    throw new Error('Method not implemented.');
  }
}
