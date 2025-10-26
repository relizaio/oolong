import { Observable } from 'rxjs';
import { Collection, IdentifierType, PaginatedProductReleaseResponse, ProductRelease } from '../models';
export declare abstract class TEAProductReleaseApi {
    abstract getCollectionForProductRelease(uuid: string, collectionVersion: number, request: Request): Collection | Promise<Collection> | Observable<Collection>;
    abstract getCollectionsByProductReleaseId(uuid: string, request: Request): Array<Collection> | Promise<Array<Collection>> | Observable<Array<Collection>>;
    abstract getLatestCollectionForProductRelease(uuid: string, request: Request): Collection | Promise<Collection> | Observable<Collection>;
    abstract getReleasesByProductId(uuid: string, pageOffset: number, pageSize: number, request: Request): PaginatedProductReleaseResponse | Promise<PaginatedProductReleaseResponse> | Observable<PaginatedProductReleaseResponse>;
    abstract getTeaProductReleaseByUuid(uuid: string, request: Request): ProductRelease | Promise<ProductRelease> | Observable<ProductRelease>;
    abstract queryTeaProductReleases(pageOffset: number, pageSize: number, idType: IdentifierType, idValue: string, request: Request): PaginatedProductReleaseResponse | Promise<PaginatedProductReleaseResponse> | Observable<PaginatedProductReleaseResponse>;
}
