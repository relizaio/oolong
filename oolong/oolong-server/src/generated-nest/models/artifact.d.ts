import { ArtifactType } from './artifact-type';
import { ArtifactFormat } from './artifact-format';
export interface Artifact {
    uuid?: string;
    name?: string;
    type?: ArtifactType;
    distributionTypes?: Array<string>;
    formats?: Array<ArtifactFormat>;
}
export declare namespace Artifact {
}
