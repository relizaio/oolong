import { Identifier } from './identifier';
export interface Component {
    uuid: string;
    name: string;
    identifiers: Array<Identifier>;
}
