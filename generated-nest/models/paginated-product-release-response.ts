import { ProductRelease } from './product-release';


/**
 * A paginated response containing TEA Product Releases
 */
export interface PaginatedProductReleaseResponse { 
  timestamp: string;
  pageStartIndex: number;
  pageSize: number;
  totalResults: number;
  results?: Array<ProductRelease>;
}

