# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run build` — clean `dist/`, run `tsc`, then copy `src/homebridge-ui` → `dist/homebridge-ui` (the `plugin-ui` step is required; UI assets are not compiled).
- `npm run lint` / `npm run lint:fix` — antfu/eslint config; runs in CI via `homebridge/.github/.github/workflows/eslint.yml`.
- `npm run prepublishOnly` — lint then build; gates publishes.

There is no test runner. CI (`.github/workflows/build.yml`) only does `npm install` across Node 20/22/24. Verification is manual: build, link into a Homebridge install, enable the desired `enable*` flag in `config.schema.json`, and pair via the Home app.

Runtime requires Node `^22.12.0 || ^24.0.0` and Homebridge `^2.0.0` (the Matter API used here is gated on `api.isMatterAvailable?.()` / `isMatterEnabled?.()`).

## Architecture

This is a **reference/example** plugin demonstrating the Homebridge 2.0 Matter API — not a bridge to real hardware. All device handlers contain `TODO` stubs where real device control would go. Treat the device files as documented templates.

### Registration flow

1. `src/index.ts` registers `MatterPlatform` with Homebridge using `PLUGIN_NAME` / `PLATFORM_NAME` from `src/settings.ts`.
2. `MatterPlatform` (in `src/platform.ts`) implements `DynamicPlatformPlugin` but only uses **Matter** accessories — `configureAccessory` is intentionally a no-op; `configureMatterAccessory` populates `this.matterAccessories` from cache.
3. On `didFinishLaunching`, `registerMatterAccessories()` runs `removeDisabledAccessories()` then a series of `registerSection*` methods grouped by Matter Spec § (4 Lighting, 5 Smart Plugs, 6 Switches, 7 Sensors, 8 Closure, 9 HVAC, 12 Robotic, plus Custom).
4. Each section instantiates the relevant `*Accessory` class, calls `.toAccessory()` to get a plain `MatterAccessory` object, and batches them into one `api.matter.registerPlatformAccessories(...)` call.

### BaseMatterAccessory pattern

`src/devices/BaseMatterAccessory.ts` is the contract every device extends:
- Subclass constructor calls `super(api, log, config)` with `UUID` (always `api.matter.uuid.generate(serialNumber)`), `displayName`, `deviceType` (from `api.matter.deviceTypes.*`), identity strings, initial `clusters` state, and `handlers` (Matter command callbacks).
- `updateState(cluster, attrs, partId?)` and `readState(cluster, partId?)` are typed wrappers over `api.matter.updateAccessoryState` / `getAccessoryState` — use these instead of calling the API directly. Both have overloads keyed on `ClusterStateMap` for autocomplete on known clusters and a `Record<string, unknown>` fallback for custom ones.
- `toAccessory()` is what gets passed to `registerPlatformAccessories` — it strips the class down to a plain object.
- Logging helpers (`logInfo`/`logError`/`logDebug`/`logWarn`) prefix every line with `[displayName]`.

### Composed devices (parts)

`src/devices/custom/PowerStripAccessory.ts` is the canonical example of multi-endpoint composition:
- Parent uses `deviceTypes.BridgedNode` as a non-controllable container (no parent clusters/handlers).
- Children are passed via `parts: [{ id, displayName, deviceType, clusters, handlers }]`. Each handler receives `(args, context)` and uses `context.partId` to identify which child fired.
- Programmatic state updates pass the `partId` as the third arg to `updateState`. `PowerStripAccessory` overrides `updateState` to add `partId`-aware debug logging — replicate this override if a new composed device needs the same behaviour.
- HomeKit limitation: child accessories inherit the parent's name in Apple Home; the part `displayName` only shows in the Homebridge UI.

### Adding a new device

1. Create `src/devices/MyDeviceAccessory.ts` extending `BaseMatterAccessory`.
2. Export it from `src/devices/index.ts` (the file is sorted; eslint's `perfectionist/sort-exports` will fail otherwise).
3. Import it in `src/platform.ts`, add an `enableMyDevice` entry to the `configMap` array in `removeDisabledAccessories` (use the **same** seed string in `api.matter.uuid.generate(...)` as the device's `serialNumber`), and instantiate it inside the appropriate `registerSection*` method.
4. Add the matching `enableMyDevice` boolean to `config.schema.json`.

The UUID seed string in `removeDisabledAccessories` must match the serial number used in the accessory class — that's how cached accessories get removed when a user disables them in config.

### Robotic devices caveat

RVC accessories (currently just `RoboticVacuumAccessory`) run as a **separate Matter process** even though the code lives in the same plugin. Expect a separate commissioning code in the logs, paired as a standalone bridge in Apple Home. The comment in `registerSection12Robotic` flags this — preserve that behaviour for any new RVC additions.

### Custom UI

`src/homebridge-ui/` ships a minimal plugin-UI server (`server.js`) and `public/index.html`. The build copies the directory verbatim into `dist/homebridge-ui` — no TS compilation runs on it, so author UI files in plain JS/HTML.

## Conventions

- ESM-only (`"type": "module"`); imports must include the `.js` extension even from `.ts` source — `tsconfig` uses `module: "nodenext"`.
- ESLint is `@antfu/eslint-config` with single quotes, sorted imports/exports, and `curly: multi-line`. Run `npm run lint:fix` before committing — sort-imports/exports rules are strict and will fail CI.
- Don't add `accessories: Map<string, PlatformAccessory>` or implement `configureAccessory` meaningfully unless this plugin starts using HAP accessories — the comments in `platform.ts` are deliberate.
