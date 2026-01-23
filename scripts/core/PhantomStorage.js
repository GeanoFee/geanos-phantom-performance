/**
 * Manages the "Phantomization" of Actors using Synchronous Shadow-RAM.
 * Handles moving data between the World (Active RAM) and the ShadowBuffer.
 */
import { SkeletonGenerator } from "./SkeletonGenerator.js";
import { ShadowBuffer } from "./ShadowBuffer.js";
import { ShadowState } from "./ShadowState.js";

export class PhantomStorage {

    // NO FLAG_SCOPE needed for state anymore!

    /**
     * Initialize the storage.
     */
    async initialize() {
        if (game.settings.get("geanos-phantom-performance", "debugMode")) {
            console.log("GPP | Shadow Storage system ready.");
        }
    }

    /**
     * Converts an active Actor into a Phantom Synchronously.
     * Implements TASS (Transient Atomic Safety Shield).
     * @param {Actor} actor 
     */
    swapOutSync(actor) {
        if (this.isPhantom(actor)) return;

        const t0 = performance.now();

        // --- TASS START: Frozen Snapshot (Golden Record) ---
        let goldenRecord = actor.toObject();

        // 1. Binary Handshake (Store)
        ShadowBuffer.store(actor);

        // 2. Atomic Verification
        const storedData = ShadowBuffer.retrieve(actor, "TASS Read-Back Validation");

        // 3. Compare (Strict Deep Equality)
        // Normalize goldenRecord to JSON-primitive types to ensure fair comparison with stored data
        const goldenRecordJson = JSON.parse(JSON.stringify(goldenRecord));
        const isExactMatch = foundry.utils.objectsEqual(goldenRecordJson, storedData);

        // GC Optimization: Explicitly release the snapshot
        goldenRecord = null;

        if (!isExactMatch) {
            console.error(`GPP | TASS FAILURE: Data mismatch for Actor ${actor.name} (${actor.id}). Aborting Phantomization.`);
            // Rollback: Delete potentially corrupt shadow data
            ShadowBuffer.delete(actor);
            return;
        }

        // --- TASS COMMIT: Proceed to Phantomize ---
        // (Golden Record is discarded automatically as it goes out of scope)

        // 4. Mark as Phantom in Runtime State
        ShadowState.mark(actor);

        // 5. Generate Skeleton
        const skeletonSystem = SkeletonGenerator.getSkeleton(actor.type);

        // 6. Nuke Data in Source (Transient Only)
        // Modifying the Actor Instance IN-PLACE
        const source = actor._source;

        // 6b. Nuke Data in Source
        source.system = skeletonSystem;
        source.items = [];
        source.effects = [];

        // 4c. Re-Prepare Data
        try {
            actor.prepareData();
        } catch (e) {
            console.warn(`GPP | Preparation warning during swapOut for ${actor.name}:`, e);
        }

        // 4d. Render to update UI (if open)
        if (actor.sheet?.rendered) actor.render();

        const duration = performance.now() - t0;
        if (duration > 10 && game.settings.get("geanos-phantom-performance", "debugMode")) {
            console.warn(`GPP | Slow TASS SwapOut for ${actor.name}: ${duration.toFixed(2)}ms`);
        }
        // console.log(`GPP | ${actor.name} is now a Phantom (Shadow-RAM).`);
    }

    /**
     * Restores a Phantom Actor to full status Synchronously.
     * @param {Actor} actor 
     */
    swapInSync(actor) {
        // Optimization: Check ShadowState first
        if (!this.isPhantom(actor)) return;

        const t0 = performance.now();

        // 1. Retrieve Data
        const fullData = ShadowBuffer.retrieve(actor);
        if (!fullData) {
            console.error(`GPP | CRITICAL: No Shadow Data for ${actor.name}! Cannot hydrate!`);
            // Emergency Unmark to prevent infinite loops of trying to hydrate
            ShadowState.unmark(actor);
            return;
        }

        // 2. Restore Source Data
        const source = actor._source;

        source.system = fullData.system;
        source.items = fullData.items;
        source.effects = fullData.effects;
        source.flags = fullData.flags;

        // 3. Unmark Runtime State
        ShadowState.unmark(actor);

        // 4. Re-Prepare Data
        actor.prepareData();

        // 5. Notify System
        Hooks.callAll("gpp.documentHydrated", actor);

        // 6. Render
        if (actor.sheet?.rendered) actor.render();

        const duration = performance.now() - t0;
        if (duration > 10 && game.settings.get("geanos-phantom-performance", "debugMode")) {
            console.warn(`GPP | Slow Hydration for ${actor.name}: ${duration.toFixed(2)}ms`);
        }
        // console.log(`GPP | ${actor.name} returned from Shadow.`);
    }

    /**
     * Check if actor is phantom
     */
    isPhantom(actor) {
        return ShadowState.isPhantom(actor);
    }

    // Legacy Async Wrappers for compatibility
    async swapOut(actor) { this.swapOutSync(actor); return Promise.resolve(); }
    async swapIn(actor) { this.swapInSync(actor); return Promise.resolve(); }
}
