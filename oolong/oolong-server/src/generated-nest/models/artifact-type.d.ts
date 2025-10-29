export declare const ArtifactType: {
    readonly Attestation: "ATTESTATION";
    readonly Bom: "BOM";
    readonly BuildMeta: "BUILD_META";
    readonly Certification: "CERTIFICATION";
    readonly Formulation: "FORMULATION";
    readonly License: "LICENSE";
    readonly ReleaseNotes: "RELEASE_NOTES";
    readonly SecurityTxt: "SECURITY_TXT";
    readonly ThreatModel: "THREAT_MODEL";
    readonly Vulnerabilities: "VULNERABILITIES";
    readonly Other: "OTHER";
};
export type ArtifactType = typeof ArtifactType[keyof typeof ArtifactType];
