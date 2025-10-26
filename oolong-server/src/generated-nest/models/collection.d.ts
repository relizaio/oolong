import { CollectionBelongsToType } from './collection-belongs-to-type';
import { CollectionUpdateReason } from './collection-update-reason';
import { Artifact } from './artifact';
export interface Collection {
    uuid?: string;
    version?: number;
    date?: string;
    belongsTo?: CollectionBelongsToType;
    updateReason?: CollectionUpdateReason;
    artifacts?: Array<Artifact>;
}
export declare namespace Collection {
}
