import { GPPDashboard } from "../ui/Dashboard.js";
import { Exorcist } from "../lib/Exorcist.js";

export class Settings {
    static init() {
        const MODULE_ID = "geanos-phantom-performance";

        // 1. Dashboard Menu
        game.settings.registerMenu(MODULE_ID, "gppDashboard", {
            name: "GPP Dashboard",
            label: "Open Dashboard",
            hint: "View memory savings and phantom statistics.",
            icon: "fas fa-chart-line",
            type: GPPDashboard,
            restricted: true
        });

        // 2. Notification Settings
        game.settings.register(MODULE_ID, "verboseNotifications", {
            name: "Verbose Notifications",
            hint: "If enabled, shows UI notifications for every hydration event. Disable to keep the UI clean.",
            scope: "client",
            config: true,
            type: Boolean,
            default: false
        });

        // 3. Debug Mode
        game.settings.register(MODULE_ID, "debugMode", {
            name: "Enable Debug Logging",
            hint: "Logs detailed performance metrics and hydration events to the console for troubleshooting.",
            scope: "client",
            config: true,
            type: Boolean,
            default: false
        });

        // 2. Exorcism Menu (Wrapper)
        const { ApplicationV2 } = foundry.applications.api;

        class ExorcismWrapper extends ApplicationV2 {
            static DEFAULT_OPTIONS = {
                id: "gpp-exorcism-wrapper",
                window: { title: "Exorcism Wrapper" }
            };

            async _renderHTML(context, options) {
                // Directly call the logic, relying on the Dialog it creates
                Exorcist.performExorcism();
                return ""; // Return empty string as we don't need UI
            }

            // Override render to ensure we catch the call
            async render(options) {
                return this._renderHTML({}, options);
            }
        }

        game.settings.registerMenu(MODULE_ID, "gppExorcism", {
            name: "The Exorcism",
            label: "Run Exorcism (Emergency Recovery)",
            hint: "WARNING: Restores ALL Phantoms to full actors. High RAM usage.",
            icon: "fas fa-skull-crossbones",
            type: ExorcismWrapper,
            restricted: true
        });

        // 3. Maximize (Phantomize All)
        class MaximizeWrapper extends ApplicationV2 {
            static DEFAULT_OPTIONS = {
                id: "gpp-maximize-wrapper",
                window: { title: "Maximize Wrapper" }
            };

            async _renderHTML(context, options) {
                // Confirm dialog
                await foundry.applications.api.DialogV2.confirm({
                    window: { title: "Maximize Performance?" },
                    content: "<p>This will attempt to phantomize <strong>ALL</strong> eligible Actors and Scenes in your world (excluding safe targets like active scenes or player characters).</p><p>This allows you to see the maximum RAM savings potential on the dashboard.</p>",
                    yes: {
                        callback: () => GPP.phantomizeAll(),
                        label: "Yes"
                    },
                    no: {
                        label: "No"
                    },
                    modal: true
                });
                return "";
            }

            async render(options) {
                return this._renderHTML({}, options);
            }
        }

        game.settings.registerMenu(MODULE_ID, "gppMaximize", {
            name: "Maximize Performance",
            label: "Phantomize Everything",
            hint: "Aggressively phantomizes all eligible entities to free up maximum RAM.",
            icon: "fas fa-compress-arrows-alt",
            type: MaximizeWrapper,
            restricted: true
        });

        console.log("GPP | Settings Registered.");
    }
}
