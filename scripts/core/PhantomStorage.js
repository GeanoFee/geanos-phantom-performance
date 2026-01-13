/**
 * Manages the "Phantomization" of Actors.
 * Handles moving data between the World (RAM) and the backing Compendium (Storage).
 */
import { SkeletonGenerator } from "./SkeletonGenerator.js";

export class PhantomStorage {
    static COMPENDIUM_ID = "world-phantom-storage";
    static FLAG_SCOPE = "geanos-phantom-performance";

    constructor() {
        this.pack = null;
    }

    /**
     * Initialize the storage compendium.
     */
    async initialize() {
        // 1. Check if pack exists
        let pack = game.packs.get(`world.${PhantomStorage.COMPENDIUM_ID}`);

        if (!pack) {
            console.log("GPP | Creating Phantom Storage Compendium...");
            // Create compendium (requires V12+ API or fallback)
            // In V12, CompendiumCollection.createCompendium works
            pack = await CompendiumCollection.createCompendium({
                type: "Actor",
                label: "GPP Phantom Actors",
                name: PhantomStorage.COMPENDIUM_ID,
                package: "world"
            });
        }

        this.pack = pack;
        console.log("GPP | Storage initialized:", this.pack.metadata.id);
    }

    /**
     * Converts an active Actor into a Phantom.
     * @param {Actor} actor 
     */
    async swapOut(actor) {
        if (this.isPhantom(actor)) return;

        console.log(`GPP | Phantomizing ${actor.name} (${actor.id})...`);

        // 1. Clone Full Data (Original)
        const fullData = actor.toObject();

        // 1.5. CRITICAL: Mark the stored data as Phantom immediately.
        // This ensures that:
        // A) The Compendium Document doesn't crash the System execution upon creation.
        // B) The Actor doesn't crash the System execution upon Hydration (swapIn).
        if (!fullData.flags) fullData.flags = {};
        if (!fullData.flags[PhantomStorage.FLAG_SCOPE]) fullData.flags[PhantomStorage.FLAG_SCOPE] = {};
        fullData.flags[PhantomStorage.FLAG_SCOPE].isPhantom = true;

        // 2. Save to Compendium
        const existingEntry = this.pack.index.find(i => i.name === actor.name && i.type === actor.type);

        let backingDoc;
        const existingId = actor.getFlag(PhantomStorage.FLAG_SCOPE, "backingId");

        if (existingId && (await this.pack.getDocument(existingId))) {
            const doc = await this.pack.getDocument(existingId);
            backingDoc = await doc.update(fullData);
        } else {
            backingDoc = await this.pack.documentClass.create(fullData, { pack: this.pack.collection });
        }

        // 2.5. SAFETY: Read-Back Verification
        // Ensure the data actually hit the DB before we destroy the local copy.
        if (!backingDoc || !backingDoc.id) {
            throw new Error(`GPP | Write Failed: Backing Document create/update returned null/undefined.`);
        }

        // Paranoid Check: Fetch fresh from index or DB to be absolutely sure
        const verifiedDoc = await this.pack.getDocument(backingDoc.id);
        if (!verifiedDoc || verifiedDoc.name !== actor.name) {
            throw new Error(`GPP | Atomic Safety Error: Verification of ${actor.name} failed. Aborting Phantomization.`);
        }

        // 3. Generate Skeleton
        const skeletonSystem = SkeletonGenerator.getSkeleton(actor.type);

        // 4. Update Actor to be a Phantom (Two-Step Process)

        // Step 4a: Set Flags FIRST (Protects against system crashes during data wipe)
        const flagsData = {
            [PhantomStorage.FLAG_SCOPE]: {
                "isPhantom": true,
                "backingId": backingDoc.id,
                "originalName": actor.name
            }
        };
        // We act directly to ensure flag is present before data changes
        await actor.update({ flags: flagsData });

        // Step 4b: Nuke Data
        const phantomUpdate = {
            "system": skeletonSystem,
            "items": [],
            "effects": []
            // Flags already set
        };

        // recursive: false replaces system object
        await actor.update(phantomUpdate, { recursive: false });

        console.log(`GPP | ${actor.name} is now a Phantom.`);
    }

    /**
     * Restores a Phantom Actor to full status.
     * @param {Actor} actor 
     */
    async swapIn(actor) {
        if (!this.isPhantom(actor)) return;

        console.log(`GPP | Hydrating ${actor.name} (${actor.id})...`);

        const backingId = actor.getFlag(PhantomStorage.FLAG_SCOPE, "backingId");
        if (!backingId) {
            console.error("GPP | Missing backing ID for", actor.name);
            return;
        }

        const backingDoc = await this.pack.getDocument(backingId);
        if (!backingDoc) {
            console.error("GPP | Backing document not found for", actor.name);
            return;
        }

        const fullData = backingDoc.toObject();
        delete fullData._id;

        // Two-Step Restoration

        // Step 1: Restore Data BUT Keep Phantom Flag (Prevents crash if logic runs on partial restore)
        if (!fullData.flags) fullData.flags = {};
        if (!fullData.flags[PhantomStorage.FLAG_SCOPE]) fullData.flags[PhantomStorage.FLAG_SCOPE] = {};

        // Force isPhantom = true for this update
        fullData.flags[PhantomStorage.FLAG_SCOPE].isPhantom = true;
        fullData.flags[PhantomStorage.FLAG_SCOPE].backingId = backingId;

        await actor.update(fullData, { recursive: false });

        // Step 2: Release protection
        await actor.setFlag(PhantomStorage.FLAG_SCOPE, "isPhantom", false);

        console.log(`GPP | ${actor.name} returned to the living.`);
        Hooks.callAll("gpp.documentHydrated", actor);
    }

    /**
     * Check if actor is phantom
     */
    isPhantom(actor) {
        return !!actor.getFlag(PhantomStorage.FLAG_SCOPE, "isPhantom");
    }
}
