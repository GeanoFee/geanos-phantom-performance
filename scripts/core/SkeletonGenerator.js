/**
 * Generates minimal valid data skeletons for Actors to avoid breaking System DataModels.
 */
export class SkeletonGenerator {

    /**
     * Returns a plain object representing the default 'system' data for a given Actor type.
     * @param {string} type - The actor type (e.g. "npc", "character")
     * @returns {object}
     */
    static getSkeleton(type) {
        // Safe access to DataModels
        const systemModels = game.system.model || {};
        const coreModels = game.model || {};

        const model = (systemModels.Actor && systemModels.Actor[type]) ||
            (coreModels.Actor && coreModels.Actor[type]);

        // If 'model' is not a class/function, we can't use 'new' on it.
        if (typeof model !== 'function') {
            console.warn(`GPP | Internal DataModel for '${type}' is not a constructor. Using empty object.`);
            return {};
        }

        if (!model) {
            console.warn(`GPP | No DataModel found for type '${type}'. Returning empty object.`);
            return {};
        }

        try {
            // Instantiate to get default values
            // We use {parent: null} to avoid attaching to any document
            const instance = new model({}, { parent: null });

            // Convert to plain object
            const obj = instance.toObject();

            // Sanity check: If the system is broken and returns empty on toObject, try to be smarter
            return obj || {};
        } catch (e) {
            console.warn(`GPP | Could not auto-generate skeleton for type '${type}'.`, e);
            return {};
        }
    }
}
