/**
 * Manages the "Phantomization" of Scenes.
 * Handles moving heavy embedded data (Walls, Tokens, Lights) to storage.
 */
export class ScenePhantomStorage {
    static COMPENDIUM_ID = "world-phantom-scenes";
    static FLAG_SCOPE = "geanos-phantom-performance";

    constructor() {
        this.pack = null;
    }

    /**
     * Initialize the storage compendium.
     */
    async initialize() {
        let pack = game.packs.get(`world.${ScenePhantomStorage.COMPENDIUM_ID}`);

        if (!pack) {
            console.log("GPP | Creating Phantom Scene Storage Compendium...");
            pack = await CompendiumCollection.createCompendium({
                type: "Scene",
                label: "GPP Phantom Scenes",
                name: ScenePhantomStorage.COMPENDIUM_ID,
                package: "world"
            });
        }

        this.pack = pack;
        console.log("GPP | Scene Storage initialized:", this.pack.metadata.id);
    }

    /**
     * Converts an active Scene into a Phantom.
     * @param {Scene} scene 
     */
    async swapOut(scene) {
        if (this.isPhantom(scene)) return;

        // Don't phantomize the currently active scene!
        if (scene.active || scene.isView) {
            console.warn("GPP | Cannot Phantomize an active or viewed Scene:", scene.name);
            return;
        }

        console.log(`GPP | Phantomizing Scene ${scene.name} (${scene.id})...`);

        // 1. Clone Full Data
        const fullData = scene.toObject();

        // 1.5. Safety Flag for Backing Data
        if (!fullData.flags) fullData.flags = {};
        if (!fullData.flags[ScenePhantomStorage.FLAG_SCOPE]) fullData.flags[ScenePhantomStorage.FLAG_SCOPE] = {};
        fullData.flags[ScenePhantomStorage.FLAG_SCOPE].isPhantom = true;

        // 2. Save to Compendium
        let backingDoc;
        const existingId = scene.getFlag(ScenePhantomStorage.FLAG_SCOPE, "backingId");

        if (existingId && (await this.pack.getDocument(existingId))) {
            const doc = await this.pack.getDocument(existingId);
            backingDoc = await doc.update(fullData);
        } else {
            backingDoc = await this.pack.documentClass.create(fullData, { pack: this.pack.collection });
        }

        // 2.5. SAFETY: Read-Back Verification
        if (!backingDoc || !backingDoc.id) {
            throw new Error(`GPP | Write Failed: Backing Scene create/update failed.`);
        }
        const verifiedDoc = await this.pack.getDocument(backingDoc.id);
        if (!verifiedDoc || verifiedDoc.name !== scene.name) {
            throw new Error(`GPP | Atomic Safety Error: Verification of Scene ${scene.name} failed. Aborting.`);
        }

        // 3. Prepare Phantom Update (Strip heavy collections)
        // Set flag FIRST (Two-Step, though Scenes are less crash-prone than Actors)
        const flagsData = {
            [ScenePhantomStorage.FLAG_SCOPE]: {
                "isPhantom": true,
                "backingId": backingDoc.id,
                "originalName": scene.name
            }
        };
        await scene.update({ flags: flagsData });

        // 4. Nuke Data
        const phantomUpdate = {
            "tokens": [],
            "lights": [],
            "walls": [],
            "sounds": [],
            "templates": [],
            "tiles": [],
            "drawings": [],
            "notes": []
        };

        await scene.update(phantomUpdate, { recursive: false });
        console.log(`GPP | Scene ${scene.name} is now a Phantom.`);
    }

    /**
     * Restores a Phantom Scene to full status.
     * @param {Scene} scene 
     */
    async swapIn(scene) {
        if (!this.isPhantom(scene)) return;

        console.log(`GPP | Hydrating Scene ${scene.name} (${scene.id})...`);

        const backingId = scene.getFlag(ScenePhantomStorage.FLAG_SCOPE, "backingId");
        if (!backingId) return;

        const backingDoc = await this.pack.getDocument(backingId);
        if (!backingDoc) return;

        const fullData = backingDoc.toObject();
        delete fullData._id;

        // Restore Data (Keep Flag)
        if (!fullData.flags) fullData.flags = {};
        if (!fullData.flags[ScenePhantomStorage.FLAG_SCOPE]) fullData.flags[ScenePhantomStorage.FLAG_SCOPE] = {};

        fullData.flags[ScenePhantomStorage.FLAG_SCOPE].isPhantom = true;
        fullData.flags[ScenePhantomStorage.FLAG_SCOPE].backingId = backingId;

        // Separate Embedded Data from Metadata
        const embeddedCollections = {
            "Token": fullData.tokens,
            "AmbientLight": fullData.lights,
            "Wall": fullData.walls,
            "AmbientSound": fullData.sounds,
            "MeasuredTemplate": fullData.templates,
            "Tile": fullData.tiles,
            "Drawing": fullData.drawings,
            "Note": fullData.notes
        };

        // 1. Skip Metadata Update
        // Since swapOut ONLY stripped collections, the metadata (including playlist, lights, etc) 
        // is already correct on the Phantom. Updating it again triggers side-effects (Audio, Heartbeat).
        // await scene.update(fullData);

        // 2. Re-Create Embedded Documents
        // We use createEmbeddedDocuments with keepId: true to ensure exact restoration

        // LOCK: Prevent SceneIntegration from trying to hydrate every single actor token immediately
        GPP.blockTokenIntegration = true;
        try {
            for (const [type, data] of Object.entries(embeddedCollections)) {
                if (data && data.length > 0) {
                    // console.log(`GPP | Restoring ${data.length} ${type}s...`);
                    await scene.createEmbeddedDocuments(type, data, { keepId: true });
                }
            }
        } finally {
            GPP.blockTokenIntegration = false;
        }

        // Release Flag
        await scene.setFlag(ScenePhantomStorage.FLAG_SCOPE, "isPhantom", false);
        console.log(`GPP | Scene ${scene.name} restored.`);
        Hooks.callAll("gpp.documentHydrated", scene);
    }

    isPhantom(scene) {
        return !!scene.getFlag(ScenePhantomStorage.FLAG_SCOPE, "isPhantom");
    }
}
