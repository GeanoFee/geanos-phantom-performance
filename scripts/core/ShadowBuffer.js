/**
 * In-Memory Storage for Phantom Actor Data.
 * Replaces the V1 Compendium-based storage with a RAM-based Map.
 */
export class ShadowBuffer {
    /**
     * @type {Map<string, Uint8Array>}
     * Map of Actor UUID -> Compressed Binary Data
     */
    static _storage = new Map();

    static _encoder = new TextEncoder();
    static _decoder = new TextDecoder();

    /**
     * Stores an Actor's data in the Shadow Buffer and returns the compressed size.
     * @param {Actor} actor 
     * @returns {number} Size in bytes
     */
    static store(actor) {
        if (!actor) return 0;
        const data = actor.toObject();

        // Remove strictly derived/ephemeral stuff if any (though toObject cleans well)
        // Encode to UTF-8 Binary (effectively compressing standard ASCII to 1 byte)
        const jsonString = JSON.stringify(data);
        const binary = this._encoder.encode(jsonString);

        this._storage.set(actor.uuid, binary);
        return binary.length;
    }

    /**
     * Retrieves and Parses Actor data from the Shadow Buffer.
     * @param {Actor} actor 
     * @returns {object|null} The full actor data
     */
    static retrieve(actor, label = "Decompressed") {
        if (!this._storage.has(actor.uuid)) return null;

        // Performance Tracking (The Shane Requirement)
        const t0 = performance.now();

        const binary = this._storage.get(actor.uuid);
        try {
            const jsonString = this._decoder.decode(binary);
            const data = JSON.parse(jsonString);

            const duration = performance.now() - t0;

            // Handle legacy 'silent=true' case just in case, though we will update callers immediately
            if (label === true) return data;

            // 1. Debug Logging (if enabled)
            // Use global game.settings directly to avoid circular dependency/async import
            const debugMode = game.settings.get("geanos-phantom-performance", "debugMode");
            if (debugMode) {
                console.log(`%cGPP | Debug | ${label} '${actor.name}' in ${duration.toFixed(3)}ms`, 'color: #00ffcc; font-weight: bold;');
            }

            // 2. Threshold Warning (Always ON)
            if (duration > 10) {
                console.warn(`GPP | Performance Warning: ${label} for ${actor.name} took ${duration.toFixed(2)}ms`);
            }

            return data;
        } catch (err) {
            console.error(`GPP | ShadowBuffer Decompression Failed for ${actor.name}:`, err);
            return null;
        }
    }


    /**
     * Checks if we hold data for this actor.
     * @param {Actor} actor 
     */
    static has(actor) {
        return this._storage.has(actor.uuid);
    }

    /**
     * Removes data from buffer (e.g. if Actor is deleted from world).
     * @param {Actor} actor 
     */
    static delete(actor) {
        this._storage.delete(actor.uuid);
    }

    /**
     * Debug: get total usage
     */
    static getSize() {
        let bytes = 0;
        for (const val of this._storage.values()) {
            bytes += val.byteLength;
        }
        return bytes;
    }
}
