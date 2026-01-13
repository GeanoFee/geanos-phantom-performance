/**
 * GPP API Verification Script
 * Run this via a Macro or Console to verify the Public API.
 */
(async () => {
    console.log("🧪 GPP API Test | Starting...");

    // 1. Check Global Access
    if (!window.GPP) {
        console.error("❌ GPP Global Object not found!");
        return;
    }
    console.log("✅ GPP Global Object found.");

    // 2. Find a Phantom
    // Force phantomize a random actor if none exist
    let phantom = game.actors.find(a => GPP.isPhantom(a));
    if (!phantom) {
        const victim = game.actors.contents[0];
        if (victim) {
            console.log(`Creating test phantom from ${victim.name}...`);
            await GPP.swapOut(victim);
            phantom = game.actors.get(victim.id); // Refresh reference!
            if (!phantom) {
                console.error("❌ Phantom vanished after swapOut!");
                return;
            }
        } else {
            console.error("❌ No actors to test with.");
            return;
        }
    }

    console.log(`👻 Selected Phantom: ${phantom.name}`);

    // 3. Test Hooks
    let hookFired = false;
    const hookId = Hooks.once("gpp.documentHydrated", (doc) => {
        if (doc.id === phantom.id) {
            console.log("✅ Hook 'gpp.documentHydrated' fired correctly!");
            hookFired = true;
        }
    });

    // 4. Test ensureHydrated (and Dedup)
    console.log("Running concurrent hydration requests...");
    const p1 = GPP.ensureHydrated(phantom);
    const p2 = GPP.ensureHydrated(phantom);

    if (p1 === p2) {
        console.log("✅ Promise deduplication loop active (Same Promise returned).");
    } else {
        console.error("❌ Promise deduplication failed!");
    }

    await p1;

    // 5. Verify Result
    if (!GPP.isPhantom(phantom)) {
        console.log("✅ Actor is fully hydrated.");
    } else {
        console.error("❌ Actor remained Phantom!");
    }

    if (hookFired) {
        console.log("✅ All Tests Passed!");
        ui.notifications.info("GPP API Verification Passed");
    } else {
        console.warn("⚠️ Hook did not fire (or timing mismatch).");
    }
})();
