

/**
 * Indicates whether a collection belongs to a component release or a product release
 */
export const CollectionBelongsToType = {
    ComponentRelease: 'COMPONENT_RELEASE',
    ProductRelease: 'PRODUCT_RELEASE'
} as const;
export type CollectionBelongsToType = typeof CollectionBelongsToType[keyof typeof CollectionBelongsToType];

