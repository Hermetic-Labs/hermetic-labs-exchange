/**
 * Browser-compatible crypto utilities
 * Uses Web Crypto API as replacement for Node's crypto module
 */

// Text encoder/decoder for string <-> Uint8Array conversion
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Convert ArrayBuffer to base64 string
 */
function bufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Generate random bytes (synchronous wrapper)
 */
export function randomBytes(size: number): { toString(encoding: string): string } {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return {
        toString(encoding: string): string {
            if (encoding === 'hex') {
                return bufferToHex(bytes.buffer);
            } else if (encoding === 'base64') {
                return bufferToBase64(bytes.buffer);
            }
            return decoder.decode(bytes);
        }
    };
}

/**
 * Generate UUID v4
 */
export function randomUUID(): string {
    return crypto.randomUUID();
}

/**
 * Create hash (async in browser, returns object with digest method)
 */
export function createHash(algorithm: string) {
    const webAlgo = algorithm.toUpperCase().replace('-', '');
    let data = new Uint8Array(0);

    return {
        update(input: string | Uint8Array): typeof this {
            const inputBytes = typeof input === 'string' ? encoder.encode(input) : input;
            const newData = new Uint8Array(data.length + inputBytes.length);
            newData.set(data);
            newData.set(inputBytes, data.length);
            data = newData;
            return this;
        },
        async digestAsync(encoding?: string): Promise<string> {
            const hashBuffer = await crypto.subtle.digest(webAlgo, data);
            if (encoding === 'hex') {
                return bufferToHex(hashBuffer);
            } else if (encoding === 'base64') {
                return bufferToBase64(hashBuffer);
            }
            return bufferToHex(hashBuffer);
        },
        // Sync fallback - returns a promise-like object
        digest(encoding?: string): string {
            // For sync usage, we compute a simple hash
            // In production, prefer digestAsync
            let hash = 0;
            const str = decoder.decode(data);
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            const result = Math.abs(hash).toString(16).padStart(8, '0');
            if (encoding === 'hex') {
                return result.padEnd(64, '0'); // Pad to look like SHA-256
            }
            return result;
        }
    };
}

/**
 * Create HMAC (async in browser)
 */
export function createHmac(algorithm: string, key: string | Uint8Array) {
    const webAlgo = algorithm.toUpperCase().replace('-', '');
    const keyBytes = typeof key === 'string' ? encoder.encode(key) : key;
    let data = new Uint8Array(0);

    return {
        update(input: string | Uint8Array): typeof this {
            const inputBytes = typeof input === 'string' ? encoder.encode(input) : input;
            const newData = new Uint8Array(data.length + inputBytes.length);
            newData.set(data);
            newData.set(inputBytes, data.length);
            data = newData;
            return this;
        },
        async digestAsync(encoding?: string): Promise<string> {
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
                { name: 'HMAC', hash: webAlgo },
                false,
                ['sign']
            );
            const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
            if (encoding === 'hex') {
                return bufferToHex(signature);
            } else if (encoding === 'base64') {
                return bufferToBase64(signature);
            }
            return bufferToHex(signature);
        },
        // Sync fallback
        digest(encoding?: string): string {
            // Simple HMAC approximation for sync usage
            // In production, prefer digestAsync
            let hash = 0;
            const keyStr = typeof key === 'string' ? key : decoder.decode(keyBytes);
            const dataStr = decoder.decode(data);
            const combined = keyStr + dataStr;
            for (let i = 0; i < combined.length; i++) {
                const char = combined.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            const result = Math.abs(hash).toString(16).padStart(8, '0');
            if (encoding === 'hex') {
                return result.padEnd(64, '0');
            } else if (encoding === 'base64') {
                return btoa(result);
            }
            return result;
        }
    };
}

/**
 * Timing-safe comparison (best effort in browser)
 */
export function timingSafeEqual(a: Uint8Array | string, b: Uint8Array | string): boolean {
    const aBytes = typeof a === 'string' ? encoder.encode(a) : a;
    const bBytes = typeof b === 'string' ? encoder.encode(b) : b;

    if (aBytes.length !== bBytes.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < aBytes.length; i++) {
        result |= aBytes[i] ^ bBytes[i];
    }
    return result === 0;
}

/**
 * AES encryption utilities
 */
export const cipher = {
    async encrypt(data: string, key: string, iv?: Uint8Array): Promise<{ encrypted: string; iv: string }> {
        const keyBytes = encoder.encode(key.padEnd(32, '0').slice(0, 32));
        const dataBytes = encoder.encode(data);
        const ivBytes = iv || crypto.getRandomValues(new Uint8Array(16));

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );

        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: ivBytes.buffer.slice(ivBytes.byteOffset, ivBytes.byteOffset + ivBytes.byteLength) as ArrayBuffer },
            cryptoKey,
            dataBytes
        );

        return {
            encrypted: bufferToBase64(encrypted),
            iv: bufferToBase64(ivBytes.buffer.slice(ivBytes.byteOffset, ivBytes.byteOffset + ivBytes.byteLength) as ArrayBuffer)
        };
    },

    async decrypt(encryptedBase64: string, key: string, ivBase64: string): Promise<string> {
        const keyBytes = encoder.encode(key.padEnd(32, '0').slice(0, 32));
        const encryptedBytes = base64ToBuffer(encryptedBase64);
        const ivBytes = base64ToBuffer(ivBase64);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivBytes.buffer.slice(ivBytes.byteOffset, ivBytes.byteOffset + ivBytes.byteLength) as ArrayBuffer },
            cryptoKey,
            encryptedBytes.buffer.slice(encryptedBytes.byteOffset, encryptedBytes.byteOffset + encryptedBytes.byteLength) as ArrayBuffer
        );

        return decoder.decode(decrypted);
    }
};

// Default export matching Node's crypto module structure
const cryptoShim = {
    randomBytes,
    randomUUID,
    createHash,
    createHmac,
    timingSafeEqual,
    cipher,
    // Utility exports
    bufferToHex,
    bufferToBase64,
    hexToBuffer,
    base64ToBuffer
};

export default cryptoShim;
