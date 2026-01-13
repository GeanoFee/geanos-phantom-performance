import { PhantomStorage } from "../core/PhantomStorage.js";
import { ScenePhantomStorage } from "../core/ScenePhantomStorage.js";
import { Exorcist } from "../lib/Exorcist.js";
import { GPPDashboard } from "../ui/Dashboard.js";

/**
 * Geano's Phantom Performance - Public API
 * The central hub for all interaction with the Phantom system.
 */
export class GPP {

    /** @type {PhantomStorage} */
    static storage = null;
    /** @type {ScenePhantomStorage} */
    static sceneStorage = null;

    /**
     * Initializes the Core GPP Systems (Synchronous)
     */
    static init() {
        this.storage = new PhantomStorage();
        this.sceneStorage = new ScenePhantomStorage();
    }

    /**
     * Connects to the Compendium Databases (Asynchronous)
     */
    static async connect() {
        await this.storage.initialize();
        await this.sceneStorage.initialize();
    }

    /* ------------------------------------------- */
    /*  Public API - For Third Party Developers    *
    /* ------------------------------------------- */

    /**
     * Ensures that a document is fully hydrated and ready for safe access.
     * If the document is a Phantom, it triggers hydration and waits for completion.
     * Returns a Promise that resolves to the hydrated document.
     * 
     * @param {Actor|Scene} document - The document to check/hydrate
     * @returns {Promise<Actor|Scene>} - The fully hydrated document
     */
    static ensureHydrated(document) {
        if (!document) return Promise.resolve();

        // 1. If not a phantom, return immediately
        if (!this.isPhantom(document)) return Promise.resolve(document);

        // 2. Check for active hydration promise (Deduplication)
        // If multiple modules request the same actor simultaneously, we don't want to run swapIn multiple times.
        if (document._gppHydrationPromise) {
            // console.log(`GPP | Joining existing hydration queue for ${document.name}...`);
            return document._gppHydrationPromise;
        }

        // 3. Start Hydration and cache the promise
        const hydrationTask = (async () => {
            if (document instanceof Actor) {
                await this.swapIn(document);
            } else if (document instanceof Scene) {
                await this.swapInScene(document);
            }
            // Clear the promise flag after completion
            delete document._gppHydrationPromise;
            return document;
        })();

        document._gppHydrationPromise = hydrationTask;
        return hydrationTask;
    }

    /**
     * Checks if a document is currently a Phantom (lightweight shell).
     * @param {Actor|Scene} document 
     * @returns {boolean}
     */
    static isPhantom(document) {
        if (document instanceof Actor) return this.storage.isPhantom(document);
        if (document instanceof Scene) return this.sceneStorage.isPhantom(document);
        return false;
    }

    /**
     * Suggests to GPP that a document will be needed soon.
     * Triggers hydration in the background without blocking execution.
     * @param {string|Actor|Scene} documentOrId 
     */
    static prioritize(documentOrId) {
        let doc = documentOrId;
        if (typeof documentOrId === "string") {
            doc = game.actors.get(documentOrId) || game.scenes.get(documentOrId);
        }

        if (doc) {
            // Fire and forget (don't await)
            this.ensureHydrated(doc);
        }
    }

    /* ------------------------------------------- */
    /*  Internal Operations / Legacy Shims         *
    /* ------------------------------------------- */

    static async swapOut(actor) {
        return this.storage.swapOut(actor);
    }

    static async swapIn(actor) {
        return this.storage.swapIn(actor);
    }

    static async swapOutScene(scene) {
        return this.sceneStorage.swapOut(scene);
    }

    static async swapInScene(scene) {
        return this.sceneStorage.swapIn(scene);
    }

    static async exorcise() {
        return Exorcist.performExorcism();
    }

    static dashboard() {
        return new GPPDashboard().render(true, { focus: true });
    }
}
