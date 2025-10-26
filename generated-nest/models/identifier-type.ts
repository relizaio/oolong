

/**
 * Enumeration of identifiers types
 */
export const IdentifierType = {
    Cpe: 'CPE',
    Tei: 'TEI',
    Purl: 'PURL'
} as const;
export type IdentifierType = typeof IdentifierType[keyof typeof IdentifierType];

