import { ProductRelease } from './product-release';
export interface PaginatedProductReleaseResponse {
    timestamp: string;
    pageStartIndex: number;
    pageSize: number;
    totalResults: number;
    results?: Array<ProductRelease>;
}
