

/**
 * Type of TEA collection update
 */
export const CollectionUpdateReasonType = {
    InitialRelease: 'INITIAL_RELEASE',
    VexUpdated: 'VEX_UPDATED',
    ArtifactUpdated: 'ARTIFACT_UPDATED',
    ArtifactAdded: 'ARTIFACT_ADDED',
    ArtifactRemoved: 'ARTIFACT_REMOVED'
} as const;
export type CollectionUpdateReasonType = typeof CollectionUpdateReasonType[keyof typeof CollectionUpdateReasonType];

