export declare const IdentifierType: {
    readonly Cpe: "CPE";
    readonly Tei: "TEI";
    readonly Purl: "PURL";
};
export type IdentifierType = typeof IdentifierType[keyof typeof IdentifierType];
