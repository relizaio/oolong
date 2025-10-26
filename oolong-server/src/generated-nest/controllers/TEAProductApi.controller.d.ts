import { Observable } from 'rxjs';
import { TEAProductApi } from '../api';
import { IdentifierType, PaginatedProductResponse, Product } from '../models';
export declare class TEAProductApiController {
    private readonly tEAProductApi;
    constructor(tEAProductApi: TEAProductApi);
    getTeaProductByUuid(uuid: string, request: Request): Product | Promise<Product> | Observable<Product>;
    queryTeaProducts(pageOffset: number, pageSize: number, idType: IdentifierType, idValue: string, request: Request): PaginatedProductResponse | Promise<PaginatedProductResponse> | Observable<PaginatedProductResponse>;
}
