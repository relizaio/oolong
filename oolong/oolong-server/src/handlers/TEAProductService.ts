import { Injectable, NotFoundException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAProductApi } from '../generated-nest/api';
import { IdentifierType, PaginatedProductResponse, Product } from '../generated-nest/models';
import { ContentLoader } from '../utils/content-loader';
import { logger } from '../utils/logger';

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
    
    logger.debug('queryTeaProducts called with:', { pageOffset, pageSize, idType, idValue });
    logger.debug('Using defaults:', { offset, size });
    let products = this.contentLoader.loadAllProducts();
    logger.debug('Total products loaded:', products.length);

    // Filter by identifier if provided
    if (idType && idValue) {
      products = products.filter(product => 
        product.identifiers?.some(id => 
          id.idType === idType && id.idValue === idValue
        )
      );
      logger.debug('Products after filtering:', products.length);
    }

    // Calculate pagination
    const totalCount = products.length;
    const start = offset * size;
    const end = start + size;
    logger.debug('Pagination:', { start, end, totalCount });
    const paginatedProducts = products.slice(start, end);
    logger.debug('Paginated products:', paginatedProducts.length);

    return {
      timestamp: new Date().toISOString(),
      pageStartIndex: offset,
      pageSize: size,
      totalResults: totalCount,
      results: paginatedProducts
    };
  }
}
