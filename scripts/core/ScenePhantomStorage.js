/**
 * Manages the "Phantomization" of Scenes using Synchronous Shadow-RAM.
 * Handles moving heavy embedded data (Walls, Tokens, Lights) to ShadowBuffer.
 */
import { ShadowBuffer } from "./ShadowBuffer.js";
import { ShadowState } from "./ShadowState.js";

export class ScenePhantomStorage {

    // NO FLAG_SCOPE needed for state anymore!

    /**
     * Initialize the storage.
     */
    async initialize() {
        if (game.settings.get("geanos-phantom-performance", "debugMode")) {
            console.log("GPP | Scene Shadow Storage ready.");
        }
    }

    /**
     * Converts an inactive Scene into a Phantom Synchronously.
     * @param {Scene} scene 
     */
    swapOutSync(scene) {
        if (this.isPhantom(scene)) return;

        const t0 = performance.now();

        // Don't phantomize the currently active scene!
        if (scene.active || scene.isView) {
            if (game.settings.get("geanos-phantom-performance", "debugMode")) {
                console.warn("GPP | Cannot Phantomize an active or viewed Scene:", scene.name);
            }
            return;
        }

        // --- TASS START: Frozen Snapshot ---
        let goldenRecord = scene.toObject();

        // 1. Binary Handshake (Store)
        ShadowBuffer.store(scene);

        // 2. Atomic Verification
        const storedData = ShadowBuffer.retrieve(scene, "TASS Read-Back Validation");

        // 3. Compare
        // Normalize goldenRecord to JSON-primitive types to ensure fair comparison with stored data
        const goldenRecordJson = JSON.parse(JSON.stringify(goldenRecord));
        const isExactMatch = foundry.utils.objectsEqual(goldenRecordJson, storedData);

        // GC Optimization: Explicitly release the snapshot
        goldenRecord = null;

        if (!isExactMatch) {
            console.error(`GPP | TASS FAILURE: Scene Data mismatch for ${scene.name}. Aborting Phantomization.`);
            ShadowBuffer.delete(scene);
            return;
        }

        // --- TASS COMMIT ---

        // 4. Mark as Phantom in Runtime State
        ShadowState.mark(scene);

        // 5. Modifying the Scene Instance IN-PLACE
        const source = scene._source;

        // 6. "Nuke" Data by stripping heavy collections
        source.tokens = [];
        source.lights = [];
        source.walls = [];
        source.sounds = [];
        source.templates = [];
        source.tiles = [];
        source.drawings = [];
        source.notes = [];

        const duration = performance.now() - t0;
        if (duration > 10 && game.settings.get("geanos-phantom-performance", "debugMode")) {
            console.warn(`GPP | Slow TASS SwapOut for Scene ${scene.name}: ${duration.toFixed(2)}ms`);
        }
        // console.log(`GPP | Scene ${scene.name} is now a Phantom.`);
    }

    /**
     * Restores a Phantom Scene to full status Synchronously.
     * @param {Scene} scene 
     */
    swapInSync(scene) {
        if (!this.isPhantom(scene)) return;

        const t0 = performance.now();

        // 1. Retrieve Data
        const fullData = ShadowBuffer.retrieve(scene);
        if (!fullData) {
            console.error(`GPP | CRITICAL: No Shadow Data for Scene ${scene.name}!`);
            ShadowState.unmark(scene);
            return;
        }

        // 2. Restore Source Data
        const source = scene._source;

        // We restore everything to be safe
        foundry.utils.mergeObject(source, fullData);

        // 3. Unmark
        ShadowState.unmark(scene);

        // 4. Notify
        const duration = performance.now() - t0;
        if (duration > 10 && game.settings.get("geanos-phantom-performance", "debugMode")) {
            console.warn(`GPP | Slow Hydration for Scene ${scene.name}: ${duration.toFixed(2)}ms`);
        }
        // console.log(`GPP | Scene ${scene.name} restored from Shadow.`);
    }

    /**
     * Check if scene is phantom
     */
    isPhantom(scene) {
        return ShadowState.isPhantom(scene);
    }

    // Legacy Async Wrappers
    async swapOut(scene) { this.swapOutSync(scene); return Promise.resolve(); }
    async swapIn(scene) { this.swapInSync(scene); return Promise.resolve(); }
}
