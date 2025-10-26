import { Observable } from 'rxjs';
import { IdentifierType, PaginatedProductResponse, Product } from '../models';
export declare abstract class TEAProductApi {
    abstract getTeaProductByUuid(uuid: string, request: Request): Product | Promise<Product> | Observable<Product>;
    abstract queryTeaProducts(pageOffset: number, pageSize: number, idType: IdentifierType, idValue: string, request: Request): PaginatedProductResponse | Promise<PaginatedProductResponse> | Observable<PaginatedProductResponse>;
}
