

/**
 * Checksum algorithm
 */
export const ChecksumType = {
    Md5: 'MD5',
    Sha1: 'SHA-1',
    Sha256: 'SHA-256',
    Sha384: 'SHA-384',
    Sha512: 'SHA-512',
    Sha3256: 'SHA3-256',
    Sha3384: 'SHA3-384',
    Sha3512: 'SHA3-512',
    Blake2b256: 'BLAKE2b-256',
    Blake2b384: 'BLAKE2b-384',
    Blake2b512: 'BLAKE2b-512',
    Blake3: 'BLAKE3'
} as const;
export type ChecksumType = typeof ChecksumType[keyof typeof ChecksumType];

