import { PhantomStorage } from "../core/PhantomStorage.js";
import { ScenePhantomStorage } from "../core/ScenePhantomStorage.js";
import { Exorcist } from "../lib/Exorcist.js";
import { GPPDashboard } from "../ui/Dashboard.js";
import { runApiTest } from "../debug/api-test.js";
import { runRegressionTest } from "../debug/core-regression-test.js";

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
    /*  Smart Logger (Transparent Diagnostics)     */
    /* ------------------------------------------- */

    /**
     * Logs to console if Debug Mode is enabled in settings.
     * @param {string} message 
     * @param {...any} args 
     */
    static log(message, ...args) {
        // Always check usage first to avoid overhead? 
        // No, game.settings.get is fast enough, but we should cache it?
        // For 'Transparent Diagnostics', dynamic is better.
        const debugMode = game.settings.get("geanos-phantom-performance", "debugMode");
        if (debugMode) {
            console.log(`%cGPP | Debug | ${message}`, 'color: #00ffcc; font-weight: bold;', ...args);
        }
    }

    /**
     * Diagnostic Suite
     */
    static diagnostics = {
        runApiTest: runApiTest,
        runRegressionTest: runRegressionTest
    };

    /* ------------------------------------------- */
    /*  Public API - For Third Party Developers    *
    /* ------------------------------------------- */

    /**
     * Ensures that a document is fully hydrated and ready for safe access.
     * @param {Actor|Scene} document 
     * @returns {Promise<Actor|Scene>} - Always resolves immediately for Actors (V2)
     */
    static ensureHydrated(document) {
        // V2 Transition: All Documents are now Synchronous.
        if (!document) return Promise.resolve();

        if (document instanceof Actor) {
            this.ensureHydratedSync(document);
            return Promise.resolve(document);
        }

        if (document instanceof Scene) {
            this.ensureHydratedSync(document); // Now maps to swapInSync internally
            return Promise.resolve(document);
        }

        return Promise.resolve(document);
    }

    /**
     * Synchronous Hydration (New V2 API)
     * @param {Actor} document 
     */
    static ensureHydratedSync(document) {
        if (!document) return;
        if (document instanceof Actor && this.isPhantom(document)) {
            this.storage.swapInSync(document);
        }
        if (document instanceof Scene && this.isPhantom(document)) {
            this.sceneStorage.swapInSync(document);
        }
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
     * @param {string|Actor|Scene} documentOrId 
     */
    static prioritize(documentOrId) {
        let doc = documentOrId;
        if (typeof documentOrId === "string") {
            doc = game.actors.get(documentOrId) || game.scenes.get(documentOrId);
        }

        if (doc) {
            this.ensureHydratedSync(doc);
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

    /**
     * Aggressively phantomizes all eligible entities in the world.
     * Useful for seeing maximum potential memory savings.
     */
    static async phantomizeAll() {
        if (!game.user.isGM) return;

        ui.notifications.info("GPP: Starting Aggressive Optimization...");
        this.log("Starting 'Phantomize Everything'...");

        let actorCount = 0;
        let sceneCount = 0;

        // 1. Actors
        const actors = game.actors.contents;
        for (const actor of actors) {
            // Safety Checks
            if (this.isPhantom(actor)) continue;
            if (actor.hasPlayerOwner) continue; // Skip PC actors for safety

            this.storage.swapOutSync(actor);
            if (this.isPhantom(actor)) actorCount++;
        }

        // 2. Scenes
        const scenes = game.scenes.contents;
        for (const scene of scenes) {
            // Safety Checks
            if (this.isPhantom(scene)) continue;
            if (scene.active || scene.isView) continue; // functionality break if active

            this.sceneStorage.swapOutSync(scene);
            if (this.isPhantom(scene)) sceneCount++;
        }

        const msg = `GPP: Optimization Complete. Phantomized ${actorCount} Actors and ${sceneCount} Scenes.`;
        this.log(msg);
        ui.notifications.info(msg);

        // Open Dashboard to show results
        this.dashboard();
    }

    static dashboard() {
        return new GPPDashboard().render(true, { focus: true });
    }
}
