import { Injectable, NotFoundException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAProductApi } from '../generated-nest/api';
import { IdentifierType, PaginatedProductResponse, Product } from '../generated-nest/models';
import { ContentLoader } from '../utils/content-loader';

@Injectable()
export class TEAProductService implements TEAProductApi {
  private contentLoader: ContentLoader;

  constructor() {
    this.contentLoader = new ContentLoader();
  }

  getTeaProductByUuid(uuid: string, request: Request): Product | Promise<Product> | Observable<Product> {
    const product = this.contentLoader.loadProductByUuid(uuid);
    if (!product) {
      throw new NotFoundException(`Product with UUID ${uuid} not found`);
    }
    return product;
  }

  queryTeaProducts(pageOffset: number, pageSize: number, idType: IdentifierType, idValue: string, request: Request): PaginatedProductResponse | Promise<PaginatedProductResponse> | Observable<PaginatedProductResponse> {
    // Default values for pagination
    const offset = pageOffset ?? 0;
    const size = pageSize ?? 100;
    
    console.log('queryTeaProducts called with:', { pageOffset, pageSize, idType, idValue });
    console.log('Using defaults:', { offset, size });
    let products = this.contentLoader.loadAllProducts();
    console.log('Total products loaded:', products.length);

    // Filter by identifier if provided
    if (idType && idValue) {
      products = products.filter(product => 
        product.identifiers?.some(id => 
          id.idType === idType && id.idValue === idValue
        )
      );
      console.log('Products after filtering:', products.length);
    }

    // Calculate pagination
    const totalCount = products.length;
    const start = offset * size;
    const end = start + size;
    console.log('Pagination:', { start, end, totalCount });
    const paginatedProducts = products.slice(start, end);
    console.log('Paginated products:', paginatedProducts.length);

    return {
      timestamp: new Date().toISOString(),
      pageStartIndex: offset,
      pageSize: size,
      totalResults: totalCount,
      results: paginatedProducts
    };
  }
}
