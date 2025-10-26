import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAProductApi } from '../generated-nest/api';
import { IdentifierType, PaginatedProductResponse, Product } from '../generated-nest/models';

@Injectable()
export class TEAProductService implements TEAProductApi {
  getTeaProductByUuid(uuid: string, request: Request): Product | Promise<Product> | Observable<Product> {
    throw new Error('Method not implemented.');
  }

  queryTeaProducts(pageOffset: number, pageSize: number, idType: IdentifierType, idValue: string, request: Request): PaginatedProductResponse | Promise<PaginatedProductResponse> | Observable<PaginatedProductResponse> {
    throw new Error('Method not implemented.');
  }
}
