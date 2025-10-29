import { Identifier } from './identifier';
import { Checksum } from './checksum';
export interface ReleaseDistribution {
    distributionType?: string;
    description?: string;
    identifiers?: Array<Identifier>;
    url?: string;
    signatureUrl?: string;
    checksums?: Array<Checksum>;
}
