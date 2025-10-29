import { Identifier } from './identifier';
export interface Product {
    uuid: string;
    name: string;
    identifiers: Array<Identifier>;
}
