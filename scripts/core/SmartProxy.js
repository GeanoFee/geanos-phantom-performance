/**
 * Installs Proxies and Wrappers to detect access to Phantom data.
 */
import { GPP } from "../main.js";

export class SmartProxy {

    static initialize() {
        console.log("GPP | Initializing Smart Proxy hooks...");
        SmartProxy.wrapActorPreparation();
    }

    static wrapActorPreparation() {
        // Use CONFIG.Actor.documentClass because game.actors is not ready in 'init'
        const ActorClass = CONFIG.Actor.documentClass;
        // console.log("GPP | SmartProxy: Patching Actor.prepareData...");

        // 1. Wrap prepareEmbeddedDocuments to Proxy collections safely
        const originalPrepareEmbeddedDocuments = ActorClass.prototype.prepareEmbeddedDocuments;
        ActorClass.prototype.prepareEmbeddedDocuments = function () {
            originalPrepareEmbeddedDocuments.apply(this, arguments);

            if (this.flags?.["geanos-phantom-performance"]?.isPhantom) {
                // Strategy: Don't replace 'this.items' (read-only).
                // Instead, wrap the methods of the collection instance.
                SmartProxy.wrapCollectionInstance(this, this.items);
                SmartProxy.wrapCollectionInstance(this, this.effects);
            }
        };

        // 2. Wrap prepareData to proxy 'system'
        const originalPrepareData = ActorClass.prototype.prepareData;
        ActorClass.prototype.prepareData = function () {
            originalPrepareData.apply(this, arguments);

            if (this.flags?.["geanos-phantom-performance"]?.isPhantom) {
                // 'system' is usually writable, so Proxy is fine.
                // console.log(`GPP | Attaching SmartProxy to ${this.name}`);
                this.system = new Proxy(this.system, SmartProxy.createSystemHandler(this));
            }
        };

        // 3. CRITICAL: Bypass System-Specific Logic for Phantoms
        // We patch the System Class directly to stop it from crashing on missing data.
        const originalPrepareDerivedData = ActorClass.prototype.prepareDerivedData;
        ActorClass.prototype.prepareDerivedData = function () {
            if (this.flags?.["geanos-phantom-performance"]?.isPhantom) {
                // Skip system logic completely for ghosts. 
                // We don't even call super.prepareDerivedData because we want ZERO processing.
                return;
            }
            return originalPrepareDerivedData.apply(this, arguments);
        };
    }

    /**
     * Wraps specific methods of a Collection instance to trigger hydration.
     */
    static wrapCollectionInstance(actor, collection) {
        if (!collection) return;

        const trigger = () => SmartProxy.triggerHydration(actor);
        const methodsToCheck = ['get', 'find', 'filter', 'forEach', 'map', 'reduce'];

        for (const method of methodsToCheck) {
            const original = collection[method];
            if (typeof original === 'function') {
                // We overwrite the method on this specific instance (safe)
                collection[method] = function (...args) {
                    trigger();
                    return original.apply(this, args);
                };
            }
        }
    }

    /**
     * Handler for Actor.system
     */
    static createSystemHandler(actor) {
        return {
            get(target, prop, receiver) {
                // If accessing specific internal Foundry props, ignore
                if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);

                // If identifying logical properties, trigger hydration
                // We debounce this to avoid 100 calls per frame

                // DEBUG LOG
                // console.log(`GPP | Property Access Detected: ${String(prop)} on ${actor.name}`);

                SmartProxy.triggerHydration(actor);

                return Reflect.get(target, prop, receiver);
            }
        };
    }

    // Simple Debounce for Hydration
    static _pendingHydrations = new Set();
    static _debounceTimer = null;

    static triggerHydration(actor) {
        if (!GPP) return; // Not ready yet

        // Add to queue
        SmartProxy._pendingHydrations.add(actor.id);

        // Schedule execution
        if (!SmartProxy._debounceTimer) {
            SmartProxy._debounceTimer = setTimeout(() => {
                SmartProxy.processQueue();
            }, 50); // 50ms stutter-buffer
        }
    }

    static async processQueue() {
        const ids = [...SmartProxy._pendingHydrations];
        SmartProxy._pendingHydrations.clear();
        SmartProxy._debounceTimer = null;

        if (ids.length === 0) return;

        console.log(`GPP | Triggering Auto-Hydration for ${ids.length} actors...`);

        // Notify User
        ui.notifications.info(`GPP: Hydrating ${ids.length} Phantom Actors...`);

        for (const id of ids) {
            const actor = game.actors.get(id);
            if (actor) {
                await GPP.swapIn(actor);
            }
        }
    }
}
