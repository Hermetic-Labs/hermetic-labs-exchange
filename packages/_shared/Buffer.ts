/**
 * Browser-compatible Buffer shim
 * Provides Buffer-like functionality using Uint8Array
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class BufferShim extends Uint8Array {
    /**
     * Create a BufferShim from various input types
     * Overloads to satisfy Uint8Array.from() static interface
     */
    static from(arrayLike: ArrayLike<number>): BufferShim;
    static from<T>(arrayLike: ArrayLike<T>, mapfn: (v: T, k: number) => number, thisArg?: unknown): BufferShim;
    static from(iterable: Iterable<number>): BufferShim;
    static from<T>(iterable: Iterable<T>, mapfn?: (v: T, k: number) => number, thisArg?: unknown): BufferShim;
    static from(data: string, encoding?: 'utf-8' | 'utf8' | 'base64' | 'hex'): BufferShim;
    static from(data: ArrayBuffer | Uint8Array | number[]): BufferShim;
    static from(
        data: string | ArrayBuffer | Uint8Array | ArrayLike<number> | Iterable<number> | number[],
        encodingOrMapfn?: 'utf-8' | 'utf8' | 'base64' | 'hex' | ((v: unknown, k: number) => number),
        thisArg?: unknown
    ): BufferShim {
        // Handle mapfn case (for Uint8Array.from compatibility)
        if (typeof encodingOrMapfn === 'function') {
            const mapfn = encodingOrMapfn;
            const arr = Array.isArray(data) ? data : Array.from(data as Iterable<unknown>);
            const mapped = arr.map((v, k) => mapfn.call(thisArg, v, k));
            return new BufferShim(new Uint8Array(mapped));
        }

        const encoding = encodingOrMapfn;

        if (typeof data === 'string') {
            if (encoding === 'base64') {
                const binary = atob(data);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                return new BufferShim(bytes);
            } else if (encoding === 'hex') {
                const bytes = new Uint8Array(data.length / 2);
                for (let i = 0; i < data.length; i += 2) {
                    bytes[i / 2] = parseInt(data.substring(i, i + 2), 16);
                }
                return new BufferShim(bytes);
            } else {
                // Default to utf-8
                return new BufferShim(encoder.encode(data));
            }
        } else if (data instanceof ArrayBuffer) {
            return new BufferShim(new Uint8Array(data));
        } else if (data instanceof Uint8Array) {
            return new BufferShim(data);
        } else if (Array.isArray(data)) {
            return new BufferShim(new Uint8Array(data));
        } else {
            // Handle ArrayLike and Iterable
            const arr = Array.from(data as Iterable<number>);
            return new BufferShim(new Uint8Array(arr));
        }
    }

    /**
     * Allocate a new BufferShim of specified size
     */
    static alloc(size: number, fill?: number): BufferShim {
        const buf = new BufferShim(size);
        if (fill !== undefined) {
            buf.fill(fill);
        }
        return buf;
    }

    /**
     * Allocate unsafe (just allocation, no fill)
     */
    static allocUnsafe(size: number): BufferShim {
        return new BufferShim(size);
    }

    /**
     * Check if value is a Buffer
     */
    static isBuffer(obj: unknown): obj is BufferShim {
        return obj instanceof BufferShim || obj instanceof Uint8Array;
    }

    /**
     * Concatenate multiple buffers
     */
    static concat(list: (Uint8Array | BufferShim)[], totalLength?: number): BufferShim {
        const length = totalLength ?? list.reduce((acc, buf) => acc + buf.length, 0);
        const result = new BufferShim(length);
        let offset = 0;
        for (const buf of list) {
            result.set(buf, offset);
            offset += buf.length;
        }
        return result;
    }

    /**
     * Get byte length of a string
     */
    static byteLength(string: string, encoding?: string): number {
        if (encoding === 'base64') {
            return Math.ceil((string.length * 3) / 4);
        }
        return encoder.encode(string).length;
    }

    /**
     * Convert to string
     */
    toString(encoding?: 'utf-8' | 'utf8' | 'base64' | 'hex'): string {
        if (encoding === 'base64') {
            let binary = '';
            for (let i = 0; i < this.length; i++) {
                binary += String.fromCharCode(this[i]);
            }
            return btoa(binary);
        } else if (encoding === 'hex') {
            return Array.from(this)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        } else {
            return decoder.decode(this);
        }
    }

    /**
     * Write string to buffer
     */
    write(string: string, offset = 0, length?: number, encoding?: string): number {
        const bytes = encoder.encode(string);
        const writeLength = length ?? bytes.length;
        for (let i = 0; i < writeLength && i < bytes.length; i++) {
            this[offset + i] = bytes[i];
        }
        return Math.min(writeLength, bytes.length);
    }

    /**
     * Slice buffer
     */
    slice(start?: number, end?: number): BufferShim {
        return new BufferShim(super.slice(start, end));
    }

    /**
     * Copy to target buffer
     */
    copy(target: Uint8Array, targetStart = 0, sourceStart = 0, sourceEnd?: number): number {
        const source = this.subarray(sourceStart, sourceEnd);
        target.set(source, targetStart);
        return source.length;
    }

    /**
     * Compare buffers
     */
    compare(target: Uint8Array): number {
        const len = Math.min(this.length, target.length);
        for (let i = 0; i < len; i++) {
            if (this[i] < target[i]) return -1;
            if (this[i] > target[i]) return 1;
        }
        if (this.length < target.length) return -1;
        if (this.length > target.length) return 1;
        return 0;
    }

    /**
     * Check equality
     */
    equals(other: Uint8Array): boolean {
        return this.compare(other) === 0;
    }

    /**
     * Read integers
     */
    readUInt8(offset: number): number {
        return this[offset];
    }

    readUInt16BE(offset: number): number {
        return (this[offset] << 8) | this[offset + 1];
    }

    readUInt16LE(offset: number): number {
        return this[offset] | (this[offset + 1] << 8);
    }

    readUInt32BE(offset: number): number {
        return (this[offset] << 24) | (this[offset + 1] << 16) |
            (this[offset + 2] << 8) | this[offset + 3];
    }

    readUInt32LE(offset: number): number {
        return this[offset] | (this[offset + 1] << 8) |
            (this[offset + 2] << 16) | (this[offset + 3] << 24);
    }

    /**
     * Write integers
     */
    writeUInt8(value: number, offset: number): number {
        this[offset] = value & 0xff;
        return offset + 1;
    }

    writeUInt16BE(value: number, offset: number): number {
        this[offset] = (value >> 8) & 0xff;
        this[offset + 1] = value & 0xff;
        return offset + 2;
    }

    writeUInt16LE(value: number, offset: number): number {
        this[offset] = value & 0xff;
        this[offset + 1] = (value >> 8) & 0xff;
        return offset + 2;
    }

    writeUInt32BE(value: number, offset: number): number {
        this[offset] = (value >> 24) & 0xff;
        this[offset + 1] = (value >> 16) & 0xff;
        this[offset + 2] = (value >> 8) & 0xff;
        this[offset + 3] = value & 0xff;
        return offset + 4;
    }

    writeUInt32LE(value: number, offset: number): number {
        this[offset] = value & 0xff;
        this[offset + 1] = (value >> 8) & 0xff;
        this[offset + 2] = (value >> 16) & 0xff;
        this[offset + 3] = (value >> 24) & 0xff;
        return offset + 4;
    }

    /**
     * JSON conversion
     */
    toJSON(): { type: 'Buffer'; data: number[] } {
        return {
            type: 'Buffer',
            data: Array.from(this)
        };
    }
}

// Export as Buffer for compatibility (both as value and type)
export const Buffer = BufferShim;
export type Buffer = BufferShim;
export default BufferShim;
