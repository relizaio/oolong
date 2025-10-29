

/**
 * Classification of TEA error response
 */
export const UnknownErrorType = {
    ObjectUnknown: 'OBJECT_UNKNOWN',
    ObjectNotShareable: 'OBJECT_NOT_SHAREABLE'
} as const;
export type UnknownErrorType = typeof UnknownErrorType[keyof typeof UnknownErrorType];

