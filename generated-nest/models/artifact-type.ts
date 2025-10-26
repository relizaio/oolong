

/**
 * Specifies the type of external reference.
 */
export const ArtifactType = {
    Attestation: 'ATTESTATION',
    Bom: 'BOM',
    BuildMeta: 'BUILD_META',
    Certification: 'CERTIFICATION',
    Formulation: 'FORMULATION',
    License: 'LICENSE',
    ReleaseNotes: 'RELEASE_NOTES',
    SecurityTxt: 'SECURITY_TXT',
    ThreatModel: 'THREAT_MODEL',
    Vulnerabilities: 'VULNERABILITIES',
    Other: 'OTHER'
} as const;
export type ArtifactType = typeof ArtifactType[keyof typeof ArtifactType];

