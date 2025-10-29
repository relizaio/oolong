export declare const CollectionUpdateReasonType: {
    readonly InitialRelease: "INITIAL_RELEASE";
    readonly VexUpdated: "VEX_UPDATED";
    readonly ArtifactUpdated: "ARTIFACT_UPDATED";
    readonly ArtifactAdded: "ARTIFACT_ADDED";
    readonly ArtifactRemoved: "ARTIFACT_REMOVED";
};
export type CollectionUpdateReasonType = typeof CollectionUpdateReasonType[keyof typeof CollectionUpdateReasonType];
