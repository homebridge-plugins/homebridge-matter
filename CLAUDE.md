# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run build` — clean `dist/`, run `tsc`, then copy `src/homebridge-ui` → `dist/homebridge-ui` (the `plugin-ui` step is required; UI assets are not compiled).
- `npm run lint` / `npm run lint:fix` — antfu/eslint config; runs in CI via `homebridge/.github/.github/workflows/eslint.yml`.
- `npm run test` — vitest unit tests (`src/**/*.test.ts`). They build a device against a mocked `api.matter` and check what would be registered; they cannot tell whether matter.js accepts it.
- `npm run changelog:sync` — fixes up the pending changelog section to list every unreleased commit in order.
- `npm run prepublishOnly` — lint then build; gates publishes.

CI (`.github/workflows/build.yml`) runs lint, then build and tests on Node 22/24/26, and fails when the changelog's top section does not list every unreleased commit (`check_changelog`).

Runtime requires Node `^22.12.0 || ^24.0.0 || ^26.0.0` and Homebridge `^2.5.0` (the Matter API used here is gated on `api.isMatterAvailable?.()` / `isMatterEnabled?.()`).

### Checking a device really registers

Unit tests mock the Matter API, so a device matter.js rejects still passes them. To check one for real, run Homebridge with Matter on and the device enabled, and read the log:

- Give the bridge a `"matter": { "port": … }` block in `config.json`, and load the plugin with `-P <dir>` where `<dir>/@homebridge-plugins/homebridge-matter` links to this repo. Run with `-D` for debug logs.
- Look for `violates device type requirements`, `invalid … adjusted` and `Unhandled Error` lines. Composed device types (energy devices especially) list exactly which attribute or feature a part is missing.
- ⚠️ Use a **fresh storage folder** after changing a device's state. A restored accessory keeps its cached state, so the new `clusters` never reach it and the old error stays.

## Architecture

This is a **reference/example** plugin demonstrating the Homebridge 2.0 Matter API — not a bridge to real hardware. All device handlers contain `TODO` stubs where real device control would go. Treat the device files as documented templates.

### Registration flow

1. `src/index.ts` registers `MatterPlatform` with Homebridge using `PLUGIN_NAME` / `PLATFORM_NAME` from `src/settings.ts`.
2. `MatterPlatform` (in `src/platform.ts`) implements `DynamicPlatformPlugin` but only uses **Matter** accessories — `configureAccessory` is intentionally a no-op; `configureMatterAccessory` populates `this.matterAccessories` from cache.
3. On `didFinishLaunching`, `registerMatterAccessories()` runs `removeDisabledAccessories()` then a series of `registerSection*` methods grouped by Matter Spec § (4 Lighting, 5 Smart Plugs, 6 Switches, 7 Sensors, 8 Closure, 9 HVAC, 12 Robotic, 13 Appliances, 14 Energy, plus Custom). Every enabled accessory is registered on every start, including the ones restored from the cache - handlers cannot be cached, so a restored accessory that is not registered again fails every command.
4. Each section instantiates the relevant `*Accessory` class, calls `.toAccessory()` to get a plain `MatterAccessory` object, and batches them into one `api.matter.registerPlatformAccessories(...)` call.

### BaseMatterAccessory pattern

`src/devices/BaseMatterAccessory.ts` is the contract every device extends:
- Subclass constructor calls `super(api, log, config)` with `UUID` (always `api.matter.uuid.generate(serialNumber)`), `displayName`, `deviceType` (from `api.matter.deviceTypes.*`), identity strings, initial `clusters` state, and `handlers` (Matter command callbacks).
- `updateState(cluster, attrs, partId?)` and `readState(cluster, partId?)` are typed wrappers over `api.matter.updateAccessoryState` / `getAccessoryState` — use these instead of calling the API directly. Both have overloads keyed on `ClusterStateMap` for autocomplete on known clusters and a `Record<string, unknown>` fallback for custom ones.
- `toAccessory()` is what gets passed to `registerPlatformAccessories` — it strips the class down to a plain object.
- `features` passes optional cluster features through (Homebridge v2.5.0+), e.g. `{ rvcCleanMode: { directModeChange: true } }` on the robot vacuum. Most features need no declaring: Homebridge picks them from the declared state.
- Logging helpers (`logInfo`/`logError`/`logDebug`/`logWarn`) prefix every line with `[displayName]`.

### Composed devices (parts)

`src/devices/custom/PowerStripAccessory.ts` is the canonical example of multi-endpoint composition:
- Parent uses `deviceTypes.BridgedNode` as a non-controllable container (no parent clusters/handlers).
- Children are passed via `parts: [{ id, displayName, deviceType, clusters, handlers }]`. Each handler receives `(args, context)` and uses `context.partId` to identify which child fired.
- Programmatic state updates pass the `partId` as the third arg to `updateState`. `PowerStripAccessory` overrides `updateState` to add `partId`-aware debug logging — replicate this override if a new composed device needs the same behaviour.
- HomeKit limitation: child accessories inherit the parent's name in Apple Home; the part `displayName` only shows in the Homebridge UI.
- Some spec device types are composed too, with the parent carrying the type: Solar Power, Battery Storage and EV Charger (Section 14). Their parts use `deviceTypes.PowerSource`, `ElectricalSensor` and `DeviceEnergyManagement`, and must carry exactly what the spec lists for that parent - matter.js reports any gap as a conformance error at registration.

### Adding a new device

1. Create `src/devices/MyDeviceAccessory.ts` extending `BaseMatterAccessory`.
2. Export it from `src/devices/index.ts` (the file is sorted; eslint's `perfectionist/sort-exports` will fail otherwise).
3. Import it in `src/platform.ts`, add an `enableMyDevice` entry to the `configMap` array in `removeDisabledAccessories` (use the **same** seed string in `api.matter.uuid.generate(...)` as the device's `serialNumber`), and instantiate it inside the appropriate `registerSection*` method.
4. Add the matching `enableMyDevice` boolean to `config.schema.json`, and its key to the right section's `items` in the `layout` (update that section's device count in its description).
5. Add a changelog bullet in the same commit, and a section to the matching wiki page (`../homebridge-matter.wiki`, one page per spec section).

The UUID seed string in `removeDisabledAccessories` must match the serial number used in the accessory class — that's how cached accessories get removed when a user disables them in config.

### Robotic devices caveat

RVC accessories (currently just `RoboticVacuumAccessory`) run as a **separate Matter process** even though the code lives in the same plugin. Expect a separate commissioning code in the logs, paired as a standalone bridge in Apple Home. The comment in `registerSection12Robotic` flags this — preserve that behaviour for any new RVC additions.

### Custom UI

`src/homebridge-ui/` ships a minimal plugin-UI server (`server.js`) and `public/index.html`. The build copies the directory verbatim into `dist/homebridge-ui` — no TS compilation runs on it, so author UI files in plain JS/HTML.

## Conventions

- ESM-only (`"type": "module"`); imports must include the `.js` extension even from `.ts` source — `tsconfig` uses `module: "nodenext"`.
- ESLint is `@antfu/eslint-config` with single quotes, sorted imports/exports, and `curly: multi-line`. Run `npm run lint:fix` before committing — sort-imports/exports rules are strict and will fail CI.
- Don't add `accessories: Map<string, PlatformAccessory>` or implement `configureAccessory` meaningfully unless this plugin starts using HAP accessories — the comments in `platform.ts` are deliberate.
