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

        // 2. Exorcism Menu (Wrapper)
        class ExorcismWrapper extends FormApplication {
            render() {
                // Directly call the logic, relying on the Dialog it creates
                Exorcist.performExorcism();
                // We don't really need to render a form for this simple trigger
                return;
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

        console.log("GPP | Settings Registered.");
    }
}
