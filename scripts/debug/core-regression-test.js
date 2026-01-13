/**
 * GPP Core Regression Test
 * Verifies that the internal engines (Storage, skeleton, proxy) still function
 * behind the new API facade.
 */
(async () => {
    console.log("🛠️ GPP Core Regression | Starting...");

    // 1. Setup Victim
    const victim = game.actors.contents.find(a => !GPP.isPhantom(a));
    if (!victim) {
        console.error("❌ No normal actors found to test on!");
        return;
    }
    const victimId = victim.id;
    console.log(`🎯 Target for Phantomization: ${victim.name} (${victimId})`);

    // 2. Test Manual Phantomization (via Shim)
    console.log("Step 1: Manual Phantomization (GPP.swapOut)...");
    await GPP.swapOut(victim);

    // REFRESH REFERENCE
    const phantom = game.actors.get(victimId);

    // 3. Verify State
    if (!GPP.isPhantom(phantom)) {
        console.error("❌ Actor failed to become Phantom!");
        return;
    }
    console.log("✅ Actor is now a Phantom.");

    // 4. Verify Skeleton (Data Stripping)
    const flags = phantom.getFlag("geanos-phantom-performance", "isPhantom");
    if (!flags) {
        console.error("❌ Phantom Flags missing!");
        return;
    }

    // Diagnostic Check for Proxy
    // Proxies are hard to detect directly, but we can check if our handler trap logs
    console.log("Diagnostic: Is system a Proxy?", util.types ? util.types.isProxy(phantom.system) : "Unknown (No Node util)");


    // 5. Test Smart Proxy (Auto-Hydration on Access)
    console.log("Step 2: Testing Smart Proxy Trigger...");

    // We set up a listener to catch the hydration
    const hydrationPromise = new Promise(resolve => {
        Hooks.once("gpp.documentHydrated", (doc) => {
            if (doc.id === victimId) resolve(doc);
        });
    });

    // TRIGGER: Accessing system data should trigger it
    // We intentionally access a property that might not exist on the skeleton to see if Proxy catches it
    const triggerAccess = phantom.system.someRandomProp;
    console.log("Checked phantom property, waiting for proxy...");

    // Wait for hook
    const hydratedDoc = await hydrationPromise;

    if (hydratedDoc && !GPP.isPhantom(hydratedDoc)) {
        console.log("✅ Smart Proxy successfully triggered hydration!");
    } else {
        console.error("❌ Smart Proxy failed to hydrate actor!");
        return;
    }

    // 6. Final Integrity Check
    // Did we get our data back?
    const restored = game.actors.get(victimId);
    if (restored.name === victim.name) {
        console.log("✅ Data integrity verified. Actor returned safely.");
        ui.notifications.info("GPP Core Regression Passed");
    }

})();
