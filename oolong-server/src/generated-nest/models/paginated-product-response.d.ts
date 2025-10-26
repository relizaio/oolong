import { Product } from './product';
export interface PaginatedProductResponse {
    timestamp: string;
    pageStartIndex: number;
    pageSize: number;
    totalResults: number;
    results?: Array<Product>;
}
