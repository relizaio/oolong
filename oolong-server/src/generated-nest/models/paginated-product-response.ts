import { Product } from './product';


/**
 * A paginated response containing TEA Products
 */
export interface PaginatedProductResponse { 
  timestamp: string;
  pageStartIndex: number;
  pageSize: number;
  totalResults: number;
  results?: Array<Product>;
}

