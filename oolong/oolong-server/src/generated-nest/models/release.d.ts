import { Identifier } from './identifier';
import { ReleaseDistribution } from './release-distribution';
export interface Release {
    uuid: string;
    component?: string;
    componentName?: string;
    version: string;
    createdDate: string;
    releaseDate?: string;
    preRelease?: boolean;
    identifiers?: Array<Identifier>;
    distributions?: Array<ReleaseDistribution>;
}
