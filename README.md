# Geano's Phantom Performance
### In-Memory Optimization. Synchronous Integrity. Zero Database Footprint.

Geano's Phantom Performance revolutionizes how FoundryVTT handles large-scale world data. By utilizing a high-performance **Synchronous Shadow-RAM Architecture**, it eliminates the memory bloat of large actor and scene collections without sacrificing speed or stability.

> [!WARNING]
> ### ⚠️ Important: Safety & Compatibility
> Please be aware that GPP operates deep within the client-side data architecture.
>
> *   **Experimental Nature:** While GPP uses **Atomic Verification** to protect your data, the sheer variety of game systems and the combination of hundreds of community modules can create a volatile environment.
> *   **Potential Risks:** In rare cases, complex module interactions could lead to UI misbehavior or data inconsistencies.
> *   **Recommendation:** Always maintain regular backups of your worlds. Test GPP in your specific environment (system + module list) before relying on it for critical long-term sessions.

## 🚀 Key Innovation: Synchronous RAM Management

GPP is engineered to meet the highest architectural standards for performance and data safety:

*   **⚡ Zero-Latency Hydration:** Utilizing **Synchronous JIT-Decompression**, data is restored within the same CPU cycle. Phantoms appear fully complete to the engine and other modules at all times.
*   **👻 The "Ghost" Protocol:** GPP leaves **zero footprint** in your world database. All Phantom states are managed purely in volatile RAM via `WeakMaps`. If you disable the module, your world remains in its original, pristine state.
*   **🛡️ TASS (Transient Atomic Safety Shield):** An atomic verification protocol ensures data safety. A document is only "phantomized" after a synchronous read-back check mathematically confirms the integrity of the Shadow-Buffer data.
*   **🏎️ CPU Courtesy:** Background processes utilize `requestIdleCallback`, ensuring that optimizations only occur during genuine CPU idle time, never interfering with your game's frame rate.

## 🛠️ Core Technologies

- **Shadow-RAM Buffering:** Heavy JSON payloads (Items, Effects, Walls) are moved into a compressed binary `Uint8Array` within the system memory.
- **Smart-In-Place Proxies:** Intelligent proxy handlers monitor access to `actor.system`, `items`, or `effects`, decompressing data instantly and transparently "Just-in-Time."
- **Synchronous Scene Integrity:** Scenes benefit from the same shadow infrastructure, allowing for near-instant scene swaps without the database latency of traditional loading.
- **Transparent Diagnostics:** A built-in diagnostic suite monitors performance. If a hydration cycle ever exceeds 10ms, it is explicitly logged for total troubleshooting transparency.

## 📊 Dashboard & Tools

*   **Real-Time Metrics:** The **GPP Dashboard** displays precisely how many megabytes of RAM you are saving through binary compression.
*   **The Exorcism:** An emergency utility to immediately re-hydrate all Phantoms in RAM - perfect for manual backups or world maintenance.
*   **Self-Test Suite:** Developers can trigger automated regression tests via `GPP.diagnostics` directly from the console.

## 👨‍💻 Developer API

GPP is designed for maximum compatibility. The synchronous nature means most modules work out-of-the-box. For deep integration, use the global `GPP` object:

```javascript
// Synchronous Access (No await required!)
GPP.ensureHydratedSync(actor); 

// Status Check (Ghost-Protocol compliant)
if (GPP.isPhantom(doc)) {
    console.log("This document is currently optimized in Shadow-RAM.");
}
```

## 🚀 Installation

**Manifest URL:** `https://github.com/GeanoFee/geanos-phantom-performance/releases/latest/download/module.json`

## License

This module is licensed under the MIT License.




