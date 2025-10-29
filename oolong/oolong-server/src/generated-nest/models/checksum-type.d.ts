export declare const ChecksumType: {
    readonly Md5: "MD5";
    readonly Sha1: "SHA-1";
    readonly Sha256: "SHA-256";
    readonly Sha384: "SHA-384";
    readonly Sha512: "SHA-512";
    readonly Sha3256: "SHA3-256";
    readonly Sha3384: "SHA3-384";
    readonly Sha3512: "SHA3-512";
    readonly Blake2b256: "BLAKE2b-256";
    readonly Blake2b384: "BLAKE2b-384";
    readonly Blake2b512: "BLAKE2b-512";
    readonly Blake3: "BLAKE3";
};
export type ChecksumType = typeof ChecksumType[keyof typeof ChecksumType];
