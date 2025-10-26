import { Identifier } from './identifier';
import { ComponentRef } from './component-ref';
export interface ProductRelease {
    uuid: string;
    product?: string;
    productName?: string;
    version: string;
    createdDate: string;
    releaseDate?: string;
    preRelease?: boolean;
    identifiers?: Array<Identifier>;
    components: Array<ComponentRef>;
}
