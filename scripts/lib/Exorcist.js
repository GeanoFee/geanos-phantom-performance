/**
 * "The Exorcism"
 * A mass recovery tool to restore ALL actors and scenes to their full state.
 * Useful for uninstallation or emergency recovery.
 */
import { GPP } from "../main.js";

export class Exorcist {

    static async performExorcism() {
        console.warn("GPP | ✝️ STARTING EXORCISM ✝️");

        const confirm = await Dialog.confirm({
            title: "GPP: The Exorcism",
            content: `
            <p><strong>Warning:</strong> This will attempt to hydrate (restore) ALL Phantom Actors and ALL Phantom Scenes.</p>
            <p>This process might take a while and will significantly increase RAM usage.</p>
            <p>Are you sure you want to remove all Phantoms?</p>
            `,
            yes: () => true,
            no: () => false,
            defaultYes: false
        });

        if (!confirm) return;

        ui.notifications.info("GPP: Exorcism Started. Please do not close Foundry.");

        // 1. Actors
        const actors = game.actors.filter(a => GPP.storage.isPhantom(a));
        console.log(`GPP | Exorcising ${actors.length} Actors...`);

        for (let i = 0; i < actors.length; i++) {
            const actor = actors[i];
            try {
                // Show progress every 5 actors
                if (i % 5 === 0 && game.settings.get("geanos-phantom-performance", "verboseNotifications")) {
                    ui.notifications.info(`GPP: Restoring Actor ${i + 1}/${actors.length}...`);
                }
                await GPP.swapIn(actor);
            } catch (err) {
                console.error(`GPP | Failed to exorcise ${actor.name}:`, err);
            }
        }

        // 2. Scenes
        const scenes = game.scenes.filter(s => GPP.sceneStorage.isPhantom(s));
        console.log(`GPP | Exorcising ${scenes.length} Scenes...`);

        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            try {
                if (i % 1 === 0 && game.settings.get("geanos-phantom-performance", "verboseNotifications")) {
                    ui.notifications.info(`GPP: Restoring Scene ${i + 1}/${scenes.length}...`);
                }
                await GPP.swapInScene(scene);
            } catch (err) {
                console.error(`GPP | Failed to exorcise Scene ${scene.name}:`, err);
            }
        }

        ui.notifications.info("GPP: Exorcism Complete. The spirits are gone.");
        console.log("GPP | ✝️ EXORCISM COMPLETE ✝️");
    }
}
