import { Observable } from 'rxjs';
import { TEAProductReleaseApi } from '../api';
import { Collection, IdentifierType, PaginatedProductReleaseResponse, ProductRelease } from '../models';
export declare class TEAProductReleaseApiController {
    private readonly tEAProductReleaseApi;
    constructor(tEAProductReleaseApi: TEAProductReleaseApi);
    getCollectionForProductRelease(uuid: string, collectionVersion: number, request: Request): Collection | Promise<Collection> | Observable<Collection>;
    getCollectionsByProductReleaseId(uuid: string, request: Request): Array<Collection> | Promise<Array<Collection>> | Observable<Array<Collection>>;
    getLatestCollectionForProductRelease(uuid: string, request: Request): Collection | Promise<Collection> | Observable<Collection>;
    getReleasesByProductId(uuid: string, pageOffset: number, pageSize: number, request: Request): PaginatedProductReleaseResponse | Promise<PaginatedProductReleaseResponse> | Observable<PaginatedProductReleaseResponse>;
    getTeaProductReleaseByUuid(uuid: string, request: Request): ProductRelease | Promise<ProductRelease> | Observable<ProductRelease>;
    queryTeaProductReleases(pageOffset: number, pageSize: number, idType: IdentifierType, idValue: string, request: Request): PaginatedProductReleaseResponse | Promise<PaginatedProductReleaseResponse> | Observable<PaginatedProductReleaseResponse>;
}
