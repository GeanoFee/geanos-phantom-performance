import { GPP } from "../main.js";
import { ScenePhantomStorage } from "./ScenePhantomStorage.js";
import { ShadowState } from "./ShadowState.js";

/**
 * Tracks usage of Scenes and handles automated phantomization (Decay).
 */
export class SceneHeatMap {
    static IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 Minutes
    static CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minutes

    // ... (constructor, start, scheduleDecay remain same) ...
    // NOTE: Replacing touch and processDecay

    constructor() {
        this.runLoop = null;
    }

    start() {
        GPP.log("Starting Scene HeatMap...");

        // Hooks to update timestamp
        Hooks.on("canvasReady", (canvas) => {
            if (canvas.scene) {
                this.touch(canvas.scene);
            }
        });

        // Loop
        this.scheduleDecay();
    }

    scheduleDecay() {
        this.runLoop = setTimeout(() => {
            requestIdleCallback(() => {
                this.processDecay().finally(() => {
                    this.scheduleDecay();
                });
            });
        }, SceneHeatMap.CHECK_INTERVAL_MS);
    }

    touch(scene) {
        if (!game.user.isGM) return;
        // In-Memory Touching via ShadowState
        ShadowState.touch(scene);
    }

    async processDecay() {
        if (!game.user.isGM) return;

        GPP.log("Running Scene Decay Cycle...");
        const now = Date.now();
        const scenes = game.scenes.contents;

        for (const scene of scenes) {
            // Skip currently active or viewed
            if (scene.active || scene.isView) {
                this.touch(scene); // Ensure active scenes stay hot
                continue;
            }


            // check if Phantom
            if (GPP.sceneStorage.isPhantom(scene)) continue;

            const lastActive = ShadowState.getLastActive(scene);
            const timeSince = now - lastActive;

            if (timeSince > SceneHeatMap.IDLE_THRESHOLD_MS) {
                GPP.log(`Scene ${scene.name} is cold (${Math.round(timeSince / 60000)} mins). Phantomizing...`);
                await GPP.sceneStorage.swapOut(scene);
            }
        }
    }
}
