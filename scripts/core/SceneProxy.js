import { GPP } from "../main.js";

/**
 * Intercepts Scene activation/viewing to trigger hydration.
 */
export class SceneProxy {

    static initialize() {
        console.log("GPP | Initializing Scene Proxy hooks...");
        SceneProxy.wrapSceneActivation();
    }

    static wrapSceneActivation() {
        // Wrap Scene.prototype.view
        const originalView = Scene.prototype.view;
        Scene.prototype.view = async function () {
            // Only intercept if we are the ones viewing it (handling GM instance)
            // AND it is actually a phantom scene
            if (this.flags?.["geanos-phantom-performance"]?.isPhantom) {
                console.log("GPP | Intercepting View for Phantom Scene:", this.name);
                if (game.settings.get("geanos-phantom-performance", "verboseNotifications")) {
                    ui.notifications.info(`GPP: Hydrating Scene "${this.name}"... please wait.`);
                }

                try {
                    // 1. Hydrate DB
                    await GPP.sceneStorage.swapIn(this);

                    // 2. Breathing Room for Hooks/DB
                    // Essential for modules like Stairways/Aeris to not trip over the update
                    await new Promise(resolve => setTimeout(resolve, 50));

                } catch (err) {
                    console.error("GPP | Hydration Failed:", err);
                    ui.notifications.error("GPP: Hydration failed! Loading Skeleton...");
                }

                // 3. Proceed with Original View (Single Render)
                // We fetch fresh to ensure we have the hydrated data
                const freshScene = game.scenes.get(this.id) || this;
                return originalView.apply(freshScene, arguments);
            }

            // Standard Pass-through
            return originalView.apply(this, arguments);
        };
    }
}
