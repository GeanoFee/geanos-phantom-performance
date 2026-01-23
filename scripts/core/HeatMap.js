import { ShadowState } from "./ShadowState.js";

export class HeatMap {
    static IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
    static CHECK_INTERVAL_MS = 5 * 60 * 1000;  // Check every 5 minutes

    constructor() {
        this.runLoop = null;
    }

    start() {
        GPP.log("Initializing Heat Map...");

        // 1. Hooks for Activity
        Hooks.on("controlToken", (token, controlled) => {
            if (controlled && token.actor) this.touch(token.actor);
        });

        Hooks.on("updateActor", (actor) => {
            this.touch(actor);
        });

        Hooks.on("updateItem", (item) => {
            if (item.parent) this.touch(item.parent);
        });

        // 3. Track Hydration as Interaction
        Hooks.on("gpp.documentHydrated", (actor) => {
            this.touch(actor);
        });

        // 2. Start Decay Loop (CPU Courtesy: Idle Callback)
        this.scheduleDecay();
    }

    scheduleDecay() {
        // Wait for usage interval, THEN wait for CPU idle to actually process
        this.runLoop = setTimeout(() => {
            requestIdleCallback(() => {
                this.processDecay().finally(() => {
                    // Reschedule only after completion
                    this.scheduleDecay();
                });
            }, { timeout: 2000 }); // Optional timeout to force run if never idle? No, let's keep it polite.
        }, HeatMap.CHECK_INTERVAL_MS);
    }

    /**
     * Mark an actor as active.
     */
    async touch(actor) {
        if (!actor) return;
        // In-Memory Touching via ShadowState
        ShadowState.touch(actor);
    }

    /**
     * Scan for inactive actors and Phantomize them.
     */
    async processDecay() {
        if (!game.user.isGM) return; // Only GM manages lifecycle

        console.log("GPP | Running Heat Map Decay...");
        const now = Date.now();

        const candidates = game.actors.filter(actor => {
            // SKIP CONDITIONS
            if (GPP.isPhantom(actor)) return false; // Already phantom
            if (actor.hasPlayerOwner) return false; // Player character
            if (actor.sheet?.rendered) return false; // GM is looking at it
            if (game.combat?.combatants.some(c => c.actorId === actor.id)) return false; // In combat

            // AGE CHECK
            const lastActive = ShadowState.getLastActive(actor);
            // If never touched (0), we treat them as active since startup? 
            // NO. If 0, then now - 0 is huge.
            // But we don't want to instant-phantomize on reload if we haven't touched them.
            // Or maybe we DO? If I reload, and I haven't touched an actor, they SHOULD be phantomized.
            // That matches "Aggressive Scan".

            return (now - lastActive) > HeatMap.IDLE_THRESHOLD_MS;
        });

        if (candidates.length === 0) return;

        console.log(`GPP | Found ${candidates.length} inactive actors. Phantomizing...`);
        ui.notifications.info(`GPP: Cleaning up ${candidates.length} inactive actors...`);

        // Process sequentially to avoid DB lockups
        for (const actor of candidates) {
            await GPP.swapOut(actor);
        }
    }
}
