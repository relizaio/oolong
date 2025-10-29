import { Checksum } from './checksum';
export interface ArtifactFormat {
    mimeType?: string;
    description?: string;
    url?: string;
    signatureUrl?: string;
    checksums?: Array<Checksum>;
}
