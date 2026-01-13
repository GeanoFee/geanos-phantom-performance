/**
 * Handles Scene-based logic, specifically Pre-fetching Phantoms.
 */
import { GPP } from "../main.js";

export class SceneIntegration {

    start() {
        console.log("GPP | Initializing Scene Integration...");

        // Trigger on Scene Load
        Hooks.on("canvasReady", async (canvas) => {
            this.prefetchSceneActors(canvas.scene);
        });

        // Trigger when a Token is dropped
        Hooks.on("createToken", (tokenDocument) => {
            if (GPP.blockTokenIntegration) return; // Prevent flood during Scene Hydration

            if (tokenDocument.actorId) {
                const actor = game.actors.get(tokenDocument.actorId);
                // Accessing GPP via window or import. Using window.GPP is safer if cyclic deps issue.
                // But we imported GPP.
                if (actor) GPP.swapIn(actor);
            }
        });
    }

    async prefetchSceneActors(scene) {
        if (!scene) return;

        console.log(`GPP | Scanning scene '${scene.name}' for Phantoms...`);

        const actorIds = new Set();
        for (const token of scene.tokens) {
            if (token.actorId) actorIds.add(token.actorId);
        }

        if (actorIds.size === 0) return;

        console.log(`GPP | Found ${actorIds.size} unique actors on scene.`);

        const promises = [];
        for (const id of actorIds) {
            const actor = game.actors.get(id);
            // Only hydrate if Phantom
            if (actor && actor.getFlag("geanos-phantom-performance", "isPhantom")) {
                promises.push(GPP.swapIn(actor));
            }
        }

        if (promises.length > 0) {
            console.log(`GPP | Pre-fetching ${promises.length} Phantoms...`);
            if (game.settings.get("geanos-phantom-performance", "verboseNotifications")) {
                ui.notifications.info(`GPP: Pre-fetching ${promises.length} actors for this scene...`);
            }
            await Promise.all(promises);
        }
    }
}
