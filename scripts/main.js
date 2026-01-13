/**
 * Geano's Phantom Performance
 * "Solving the Sidebar-Data-Dilemma"
 */

// Imports
import { GPP } from "./api/GPP.js";
import { SmartProxy } from "./core/SmartProxy.js";
import { HeatMap } from "./core/HeatMap.js";
import { SceneIntegration } from "./core/SceneIntegration.js";
// Phase 5 Imports
import { SceneProxy } from "./core/SceneProxy.js";
import { SceneHeatMap } from "./core/SceneHeatMap.js";
// Phase 6 Imports
import { Settings } from "./core/Settings.js";

// Re-export GPP for other modules to import only if they desire strict typing, 
// though window.GPP is the preferred method for loose coupling.
export { GPP };

Hooks.once("init", () => {
    console.log("Geano's Phantom Performance | Initializing...");

    // Register Settings
    Settings.init();

    // Initialize Core Systems (Instances)
    GPP.init();

    // Expose Global API (Immediately)
    window.GPP = GPP;

    // Proxies
    SmartProxy.initialize();
    SceneProxy.initialize(); // NEW
});

Hooks.once("ready", async () => {
    console.log("Geano's Phantom Performance | Ready.");

    // Connect to Database
    await GPP.connect();

    // Note: GPP.init() is called in init hook now to ensure window.GPP implies readiness (mostly),
    // but the actual Compendium initialization is async.
    // However, GPP.init() awaits it. But 'init' hook in Foundry does not await async callbacks before moving to ready?
    // Actually, it's safer to rely on internal checks, but for now we moved init() to init hook.
    // WAIT: Compendium creation might need 'ready' if packs aren't loaded? 
    // Usually 'init' is too early for pack operations if they are world packs?
    // Let's keep data usage in 'ready' to be safe, or check if existing logic worked.
    // Previous Code had storage.initialize() in 'ready'. Let's revert that specific part or ensure GPP.init handles it safely.

    // To be safe and consistent with previous behavior, let's keep expensive init in ready.
    // But we want window.GPP to exist early.

    // Start Loops
    const heatMap = new HeatMap();
    heatMap.start();

    const sceneHeatMap = new SceneHeatMap(); // NEW
    sceneHeatMap.start();

    // Scene Pre-fetch logic for Actors
    const sceneInt = new SceneIntegration();
    sceneInt.start();

    // Initial "Aggressive" Scan (First Run Experience)
    // Runs 5 seconds after ready to let the world settle, then cleans up everything cold.
    setTimeout(async () => {
        const phantomsBefore = game.actors.filter(a => GPP.storage.isPhantom(a)).length;
        if (phantomsBefore === 0) {
            console.log("GPP | Performing Initial Scan...");
            // We don't await these to not block the main thread, 
            // but we want them to run.
            await heatMap.processDecay();
            await sceneHeatMap.processDecay();

            // Check results for the "Wow" factor
            const phantomsAfter = game.actors.filter(a => GPP.storage.isPhantom(a)).length;
            if (phantomsAfter > 0) {
                ui.notifications.info(`GPP: Initial Scan Complete. Optimized ${phantomsAfter} entities.`);
            }
        }
    }, 5000);
});
