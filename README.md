# Geano's Phantom Performance
### **Massive Performance for Massive Worlds.**

GPP solves the single greatest bottleneck in Foundry VTT: **Database Bloat**. It intelligently transforms inactive actors and scenes into lightweight **Phantoms**, drastically reducing RAM usage and initial load times.

---

## 🚀 Why GPP?
By default, Foundry VTT loads *every* piece of data in your world database upon startup. GPP breaks this limit:

* **Blazing Fast Logins:** Experience up to **90% faster load times** for you and your players.
* **Minimal RAM Footprint:** Inactive data no longer occupies precious system memory, preventing browser crashes on large campaigns.
* **Seamless Gameplay:** Using **Smart Proxies**, data is hydrated "Just-in-Time" the moment it’s accessed—completely invisible to the user.

---

## 🛠️ Key Features

* **👻 Phantomization:** Heavy JSON data (items, effects, walls) is offloaded to a background archive, leaving a minimal "Skeleton" in the world database.
* **🔥 Smart Heat-Map:** GPP tracks real-time activity and automatically "sleeps" unused documents after a period of inactivity.
* **🏞️ Phantom Scenes:** Entire inactive maps are stripped of walls, lights, and sounds, preventing thousands of objects from cluttering memory until the scene is viewed.
* **🛡️ Atomic Safety:** A **Read-Back Verification** protocol ensures data integrity. Documents are only stripped after successful storage is confirmed by the database.

---

## 📊 Dashboard & Recovery
Maintain total control over your world’s resources:

* **GPP Dashboard:** Real-time metrics on RAM saved, Efficiency, and Phantom counts directly within the module interface.
* **"The Exorcism":** A safety utility that restores all Phantom data to its original state with a single click—perfect for debugging or uninstallation.

---

## 👨‍💻 For Developers (Middleware API)
GPP is designed to be "Plug-and-Play." Other modules can interact safely with Phantoms using the built-in API:

```javascript
const gpp = window.GPP;
if (gpp) {
    // Asynchronously hydrates the actor if it is a Phantom
    await gpp.ensureHydrated(actor); 
}
// Safe access to actor.system follows!

* **GPP.isPhantom(doc):** Quick status check for any document.
* **GPP.prioritize(id):** Fire-and-forget background hydration (e.g., on hover or target selection).
* **Hook gpp.documentHydrated:** React to documents as they become fully available.
