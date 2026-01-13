# Geano's Phantom Performance (GPP)
**"Ghosts in the Machine" - A High-Performance Memory Manager for Foundry VTT**

## Overview
Geano's Phantom Performance (GPP) drastically reduces the memory footprint of your FoundryVTT world by intelligently managing Scene and Actor data. It distinguishes between **"Hot Data"** (actively used actors/scenes) and **"Phantom Data"** (inactive actors/scenes), offloading the bulk of unused data to a hidden storage compendium while keeping a lightweight "Skeleton" in the world.

## ✨ Key Features

### 👻 Phantomization (Data Stripping)
When an actor becomes inactive, GPP "Phantomizes" it to free up resources.
* **Swap Out:** The full actor data (items, effects, detailed biography) is cloned and safely saved to a local Compendium (`world-phantom-storage`).
* **Skeleton:** The actor residing in the world database is stripped down to a minimal valid state (a "Skeleton"). It retains critical references (Name, ID, Token Image) but sheds the heavy JSON data that bloats your world.
* **Result:** Initial world load times are faster, and RAM usage is lower for all connected clients.

### 🔥 The Heat Map (Activity Tracking)
GPP monitors your game in real-time to decide "Who stays?" and "Who goes?".
* **Activity Tracking:** Every time a Token moves, an attack is rolled, or a character sheet is opened, the actor's "Last Active" timestamp is updated.
* **Automatic Decay:** A background process runs periodically to check for actors that have been idle for too long (Default: 30 minutes). These "cold" actors are automatically phantomized.

### 🛡️ Smart Proxy (Just-in-Time Hydration)
You never have to manually "load" an actor. GPP ensures seamless compatibility with other modules and macros using **ES6 Proxies**.
* **Interception:** If any script, module (like Midi-QOL), or user action tries to access the `items` or `system` data of a Phantom actor, GPP intercepts the request.
* **Instant Hydration:** The module immediately triggers a "Swap In" operation, fetching the data from storage and restoring the actor to its full glory.
* **Crash Protection:** While the data is being restored, the Proxy returns safe default values (e.g., empty arrays or 0) to prevent external scripts from crashing due to missing data.

### 🎬 Scene Integration
GPP anticipates what you need before you need it.
* **Pre-fetching:** When the GM activates a scene, GPP scans the tokens placed on that canvas. Any "Phantom" actors associated with those tokens are automatically queued for hydration.
* **Compatibility First:** GPP uses "Progressive Loading" interception for Scene transitions. This ensures maximum compatibility with modules like **Stairways** (Teleporters) or **Aeris Scene Fades** (Animations), preventing race conditions or black screens.

### 🏞️ Phantom Scenes
Just like Actors, entire Scenes can be heavy. GPP can strip inactive Scenes of their contents to save even more RAM.
* **Stripping:** Inactive scenes are stripped of `tokens`, `walls`, `lights`, `sounds`, `drawings`, `templates`, and `tiles`. Only the metadata (Name, Background Image, Grid) remains.
* **Auto-Hydration:** When the GM clicks to **View** or **Activate** a Phantom Scene, GPP intercepts the request, restores all the embedded data from the `world-phantom-scenes` compendium, and *then* loads the canvas.
* **RAM Savings:** Massive reduction in initial world load time, as thousands of walls/lights from unused maps are not loaded into memory.

### 📊 Tools & Utilities
FoundryVTT is your domain, and GPP gives you the tools to manage it. Access these via `Module Settings`.

#### 1. GPP Dashboard
A visual interface to monitor the efficiency of the system.
* **Real-time Metrics:** See exactly how many Actors and Scenes are currently phantomized.
* **RAM Savings:** View an estimate of how much memory GPP is saving you right now.
* **Efficiency Score:** A gamified score of how optimized your world is.

#### 2. "The Exorcism" (Panic Button)
Ideally, you never need this. But if you decide to uninstall GPP or need to debug a mod conflict:
* **One-Click Recovery:** This utility iterates through your entire world and forces a `swapIn` (Hydration) for **every single** Phantom Actor and Scene.
* **Result:** Your world is restored to its default, heavy state, with zero dependency on GPP's logic.

### 🛡️ Atomic Write Safety
Data integrity is paramount. GPP employs a **Read-Back Verification** protocol.
* **Trust, but Verify:** Before any stripped "Skeleton" data is written to your world, GPP verifies that the full data has been successfully written to and **confirmed** by the database.
* **Crash Proof:** If your server crashes mid-operation, the original data remains untouched. Stripping only occurs after a confirmed successful backup.

## 🚀 Installation

- **Manifest URL**: `https://github.com/GeanoFee/geanos-phantom-performance/releases/latest/download/module.json` within Foundry's "Install Module" window.

## 🔧 Technical Summary

Geano's Phantom Performance operates by intercepting the FoundryVTT `Actor` class methods to inject its "Smart Proxy" layer. It utilizes a `flags` based system to track state (`isPhantom`, `backingId`) and relies on standard Foundry Document methods (`update`, `create`, `delete`) to ensure data integrity is maintained within the `world-phantom-storage` compendium.







