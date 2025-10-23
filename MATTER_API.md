# Homebridge Matter Integration API

This document serves as a comprehensive guide for integrating Matter devices into Homebridge plugins. It covers the core concepts, patterns, and device-specific implementations.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [The Two-Way Flow Architecture](#the-two-way-flow-architecture)
3. [Implementing Matter Devices](#implementing-matter-devices)
4. [Reading and Updating State](#reading-and-updating-state)
5. [Monitoring External Changes](#monitoring-external-changes)
6. [Using Matter Types](#using-matter-types)
7. [Best Practices](#best-practices)
8. [API Reference](#api-reference)
9. [Device Reference](#device-reference)

---

## Core Concepts

### Matter Device Architecture

Matter devices in Homebridge are **virtual devices** that bridge your physical IoT devices (cloud API, HTTP, MQTT, etc.) to the Matter protocol. Understanding this separation is crucial:

- **Physical Device**: Your actual IoT device (controlled via API, MQTT, HTTP, etc.)
- **Virtual Matter Device**: A Matter representation in Homebridge that Home app communicates with
- **Your Plugin**: Acts as the bridge between the two, translating commands and synchronizing state

### Coming from HAP? Quick Reference

**If you're familiar with HAP (HomeKit Accessory Protocol), here's the essential translation:**

| HAP Concept        | Matter Equivalent | Quick Description                              |
|--------------------|-------------------|------------------------------------------------|
| **Accessory**      | **Endpoint**      | The device (one tile in Home app)              |
| **Service**        | **Cluster**       | A capability (Lightbulb, Switch, etc.)         |
| **Characteristic** | **Attribute**     | A property (On, Brightness, Temperature, etc.) |

**Key difference**: Matter uses a **declarative configuration** approach (define everything upfront) instead of HAP's object-oriented approach (add services, set characteristics). Both protocols automatically update state after handlers complete successfully.

### Clusters (HAP: Services)

**Clusters** are the building blocks of Matter devices, equivalent to **Services** in HAP. They define functionality and state:

- **OnOff Cluster** *(HAP: Switch/Lightbulb Service)*: Controls power state (on/off)
- **LevelControl Cluster** *(HAP: Brightness Characteristic)*: Controls brightness/level (1-254)
- **ColorControl Cluster** *(HAP: Hue/Saturation Characteristics)*: Controls color (hue/saturation/temperature)
- And many more...

Each cluster has:
- **Attributes** *(HAP: Characteristics)*: State values (e.g., `onOff: true`, `currentLevel: 127`)
- **Commands** *(HAP: Characteristic setters)*: Actions that can be invoked (e.g., `on()`, `off()`, `moveToLevel()`)

#### Understanding Commands (vs HAP Characteristic Setters)

**Commands** are a new concept if you're coming from HAP. Here's how they compare:

**In HAP:**
```typescript
// You set a characteristic value, which triggers onSet
service.getCharacteristic(Characteristic.On)
  .onSet(async (value: boolean) => {
    // value is true or false
    await device.setPower(value)
  })
```

**In Matter:**
```typescript
// Separate commands are invoked for different actions
handlers: {
  onOff: {
    on: async () => {
      // Explicit "on" command was invoked
      await device.turnOn()
    },
    off: async () => {
      // Explicit "off" command was invoked
      await device.turnOff()
    },
  },
}
```

**Key differences:**

1. **Action-oriented vs Value-oriented**
   - HAP: You set a value (`true`/`false`) and interpret what to do
   - Matter: Specific commands (`on()`, `off()`) with clear intent

2. **Command Parameters**
   - Simple commands like `on()` and `off()` take no parameters
   - Complex commands like `moveToLevelWithOnOff()` receive parameters:
     ```typescript
     handlers: {
       levelControl: {
         moveToLevelWithOnOff: async (request) => {
           const level = request.level        // 1-254
           const transitionTime = request.transitionTime  // Optional
           await device.setBrightness(level)
         },
       },
     }
     ```

3. **Handler Mapping**
   - Each command maps to a handler function in your `handlers` object
   - Command names are predefined by the Matter spec (not arbitrary)
   - Common commands:
     - **OnOff**: `on()`, `off()`, `toggle()`
     - **LevelControl**: `moveToLevel()`, `moveToLevelWithOnOff()`, `step()`, `stop()`
     - **ColorControl**: `moveToHue()`, `moveToSaturation()`, `moveToHueAndSaturation()`
     - **DoorLock**: `lockDoor()`, `unlockDoor()`

**Practical example - Brightness:**

```typescript
// HAP approach
service.getCharacteristic(Characteristic.Brightness)
  .onSet(async (value: number) => {
    // You receive the target brightness value
    await device.setBrightness(value)
  })

// Matter approach
handlers: {
  levelControl: {
    moveToLevelWithOnOff: async (request) => {
      // Command with parameters
      const targetLevel = request.level  // 1-254
      await device.setBrightness(targetLevel)
    },
  },
}
```

The command-based approach is more explicit about the user's intent and can provide additional context (like transition time for smooth dimming).

#### Type-Safe Handler Arguments with MatterRequests

For commands with parameters, import `MatterRequests` for TypeScript autocomplete and type checking:

```typescript
import type { MatterRequests } from 'homebridge'

handlers: {
  levelControl: {
    moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
      const { level, transitionTime } = request  // Fully typed!
      await device.setBrightness(level)
    },
  },
}
```

**Quick Examples:**
- `MatterRequests.MoveToLevel` - Brightness control
- `MatterRequests.MoveToHueAndSaturation` - Color control
- `MatterRequests.LockDoor` - Door lock with optional PIN
- `MatterRequests.SetpointRaiseLower` - Thermostat temperature

**Why use this?**
✅ Autocomplete shows available properties
✅ Compile-time errors for typos
✅ Hover to see parameter types

**Note:** TypeScript types only - not available on `api.matter` at runtime.

<details>
<summary><strong>Click to see all MatterRequests types</strong></summary>

#### Level Control
```typescript
MatterRequests.MoveToLevel // { level, transitionTime?, optionsMask?, optionsOverride? }
MatterRequests.Move // { moveMode, rate?, optionsMask?, optionsOverride? }
MatterRequests.Step // { stepMode, stepSize, transitionTime?, ... }
MatterRequests.Stop // { optionsMask?, optionsOverride? }
```

#### Color Control
```typescript
MatterRequests.MoveToHue // { hue, direction, transitionTime?, ... }
MatterRequests.MoveToSaturation // { saturation, transitionTime?, ... }
MatterRequests.MoveToHueAndSaturation // { hue, saturation, transitionTime?, ... }
MatterRequests.MoveToColorTemperature // { colorTemperatureMireds, transitionTime?, ... }
MatterRequests.MoveHue // { moveMode, rate?, ... }
MatterRequests.MoveSaturation // { moveMode, rate?, ... }
MatterRequests.MoveColorTemperature // { moveMode, rate?, ... }
MatterRequests.StepHue // { stepMode, stepSize, transitionTime?, ... }
MatterRequests.StepSaturation // { stepMode, stepSize, transitionTime?, ... }
MatterRequests.StepColorTemperature // { stepMode, stepSize, transitionTime?, ... }
```

#### Door Lock
```typescript
MatterRequests.LockDoor // { pinCode? }
MatterRequests.UnlockDoor // { pinCode? }
```

#### Window Covering
```typescript
MatterRequests.GoToLiftPercentage // { liftPercent100thsValue }
MatterRequests.GoToTiltPercentage // { tiltPercent100thsValue }
```

#### Thermostat
```typescript
MatterRequests.SetpointRaiseLower // { mode, amount }
```

#### Fan Control
```typescript
MatterRequests.FanStep // { direction, wrap?, lowestOff? }
```

</details>

### Endpoints vs Clusters (HAP: Accessories vs Services)

Understanding the relationship between endpoints and clusters is fundamental to Matter architecture.

#### The Hierarchy

```
Matter Node (Homebridge instance)
  └── Endpoint 1 (e.g., "Living Room Light")
      ├── Cluster: OnOff
      ├── Cluster: LevelControl
      └── Cluster: ColorControl
  └── Endpoint 2 (e.g., "Bedroom Light")
      ├── Cluster: OnOff
      └── Cluster: LevelControl
  └── Endpoint 3 (e.g., "Temperature Sensor")
      └── Cluster: TemperatureMeasurement
```

#### Endpoints

**Endpoints** are individual addressable "devices" or "sub-devices" within a Matter node.

- Each endpoint represents **one accessory** that appears in Home app
- Each endpoint has a **device type** (OnOffLight, DimmableLight, TemperatureSensor, etc.)
- Endpoints are numbered (Endpoint 0 is reserved for root/node-level, Endpoint 1+ are your devices)
- Each endpoint appears as a **separate tile** in Home app

**Examples**:
- A single smart bulb = 1 endpoint
- A 3-gang light switch = 3 endpoints (one per switch)
- A combo device (light + motion sensor) = 2 endpoints

#### Clusters

**Clusters** are the functional building blocks **within** an endpoint.

- Each cluster provides a **specific capability** (power control, brightness, temperature sensing, etc.)
- Clusters contain **attributes** (state values) and **commands** (actions)
- Multiple clusters combine to create the full functionality of an endpoint
- Clusters are reusable across different device types

**Examples**:
- **OnOff cluster**: Provides on/off capability
- **LevelControl cluster**: Provides brightness/level control
- **TemperatureMeasurement cluster**: Provides temperature reading

#### In Practice

When you create a Matter accessory in Homebridge:

```typescript
const accessory = {
  // This creates an ENDPOINT
  uuid: api.matter.uuid.generate('my-light'),
  displayName: 'Living Room Light',
  deviceType: api.matter.deviceTypes.DimmableLight,

  // These are CLUSTERS within the endpoint
  clusters: {
    onOff: { onOff: false }, // OnOff cluster
    levelControl: { currentLevel: 127 }, // LevelControl cluster
  },
}
```

**Key Points**:
- **Each accessory you create = 1 endpoint**
- The `clusters` object defines which clusters (capabilities) that endpoint has
- The device type determines which clusters are required/optional for that endpoint

#### HAP vs Matter: Detailed Comparison

For HAP developers, here's how common patterns translate:

| Aspect                    | HAP                                                   | Matter                                                   |
|---------------------------|-------------------------------------------------------|----------------------------------------------------------|
| **Structure**             | Object-oriented (classes, methods)                    | Configuration-based (objects)                            |
| **Services/Clusters**     | Added dynamically with `addService()`                 | Defined upfront in `clusters` object                     |
| **Handlers**              | Registered per-characteristic (`onSet`, `onGet`)      | Grouped by cluster in `handlers` object                  |
| **State Updates**         | `updateCharacteristic()` per characteristic           | `updateAccessoryState()` per cluster                     |
| **Reading State**         | Via getter methods or cached values                   | Direct property access: `accessory.clusters.onOff.onOff` |
| **Multiple Capabilities** | Multiple services on one accessory                    | Multiple clusters in one endpoint                        |
| **Automatic Updates**     | Automatic after handlers, manual for external changes | Automatic after handlers, manual for external changes    |

---

## The Two-Way Flow Architecture

There are **TWO separate flows** for every Matter device, which is similar to HAP.

### Flow A: Home App → Physical Device (AUTOMATIC)

When a user controls the device via Home app:

```
1. User taps in Home App
2. Matter command received by Homebridge
3. Your handler runs (e.g., on(), off(), moveToLevel())
4. You control your physical device (API call, MQTT, etc.)
5. Homebridge AUTOMATICALLY updates Matter state
6. All controllers (iPhone, iPad, etc.) are notified
```

**✅ Key Point**: After your handler completes, Homebridge **automatically** updates the Matter state. **DO NOT** call `api.matter.updateAccessoryState()` in handlers!

```typescript
handlers: {
  onOff: {
    on: async () => {
      // Control physical device
      await myDeviceAPI.turnOn()

      // ❌ WRONG: Do NOT manually update state here!
      // api.matter.updateAccessoryState(...)

      // ✅ Homebridge automatically updates state after this handler
    },
  },
}
```

### Flow B: Physical Device → Home App (MANUAL)

When your physical device changes externally (button press, cloud app, automation):

```
1. Physical device changes state
2. ❌ Homebridge has NO IDEA this happened!
3. You MUST detect the change (events/polling)
4. You MUST call api.matter.updateAccessoryState()
5. Then all controllers are notified
```

**⚠️ Key Point**: You **must** monitor your device and explicitly update Matter state when the physical device changes.

```typescript
// Example: MQTT listener detecting external changes
mqttClient.on('message', (topic, message) => {
  const deviceState = JSON.parse(message.toString())
  const deviceIsOn = deviceState.state === 'ON'

  // Check if state changed
  const currentMatterState = accessory.clusters.onOff.onOff
  if (deviceIsOn !== currentMatterState) {
    // ✅ Update Matter state - this is required!
    api.matter.updateAccessoryState(
      accessory.uuid,
      api.matter.clusterNames.OnOff,
      { onOff: deviceIsOn }
    )
  }
})
```

### Why No Automatic Detection?

Your physical device is **not** a Matter device—it's a regular IoT device (HTTP, MQTT, cloud API, etc.). The virtual Matter device in Homebridge cannot magically detect when your physical device changes. You must explicitly tell Homebridge when changes occur.

---

## Implementing Matter Devices

Now that you understand the core concepts and two-way flow architecture, let's implement a Matter device.

### Basic Structure

Every Matter device registration follows this pattern:

```typescript
import type { API } from 'homebridge'

export function registerMyDevice(api: API) {
  const accessory = {
    // Identity
    uuid: api.matter.uuid.generate('unique-device-id'),
    displayName: 'My Device',
    deviceType: api.matter.deviceTypes.OnOffLight,
    serialNumber: 'DEVICE-001',
    manufacturer: 'My Company',
    model: 'Model v1',

    // Optional: Persistent context storage
    context: {
      deviceId: 'my-device-123',
    },

    // State: Initial values for all cluster attributes
    // These values are only used when the accessory is first created
    // After that, Homebridge automatically persists and restores state across restarts
    clusters: {
      onOff: {
        onOff: false, // Initial state (only used on first creation)
      },
    },

    // Handlers: Respond to commands from Home app
    handlers: {
      onOff: {
        on: async () => {
          // Control your physical device
        },
        off: async () => {
          // Control your physical device
        },
      },
    },
  }

  return [accessory]
}
```

### Device Identity

Every accessory needs unique identification:

```typescript
{
  uuid: api.matter.uuid.generate('unique-id'),  // Must be unique per device
  displayName: 'Living Room Light',             // Name shown in Home app
  deviceType: api.matter.deviceTypes.OnOffLight, // Matter device type
  serialNumber: 'LIGHT-001',                     // Unique serial number
  manufacturer: 'My Company',                    // Manufacturer name
  model: 'Smart Light v1',                       // Model identifier
}
```

### Available Device Types

Access all Matter device types via `api.matter.deviceTypes`:

```typescript
// Common examples
api.matter.deviceTypes.OnOffLight
api.matter.deviceTypes.DimmableLight
api.matter.deviceTypes.TemperatureSensor
api.matter.deviceTypes.Thermostat
api.matter.deviceTypes.DoorLock
// ... see full list below
```

<details>
<summary><strong>Click to see all available device types</strong></summary>

#### Lighting
```typescript
api.matter.deviceTypes.OnOffLight
api.matter.deviceTypes.DimmableLight
api.matter.deviceTypes.ColorTemperatureLight
api.matter.deviceTypes.ExtendedColorLight
```

#### Switches & Outlets
```typescript
api.matter.deviceTypes.OnOffSwitch
api.matter.deviceTypes.OnOffOutlet
```

#### Sensors
```typescript
api.matter.deviceTypes.TemperatureSensor
api.matter.deviceTypes.HumiditySensor
api.matter.deviceTypes.LightSensor
api.matter.deviceTypes.MotionSensor
api.matter.deviceTypes.ContactSensor
api.matter.deviceTypes.LeakSensor
api.matter.deviceTypes.SmokeSensor
```

#### HVAC
```typescript
api.matter.deviceTypes.Thermostat
api.matter.deviceTypes.Fan
api.matter.deviceTypes.RoomAirConditioner
```

#### Security
```typescript
api.matter.deviceTypes.DoorLock
```

#### Window Coverings
```typescript
api.matter.deviceTypes.WindowCovering
```

#### Appliances
```typescript
api.matter.deviceTypes.RoboticVacuumCleaner
```

#### Other
```typescript
api.matter.deviceTypes.GenericSwitch
api.matter.deviceTypes.Pump
```

</details>

### Persistent Context Storage

Store custom data that persists across Homebridge restarts:

```typescript
{
  context: {
    deviceId: 'my-light-123',
    lastKnownState: true,
    customData: { /* anything */ }
  },
}

// Access later:
const deviceId = accessory.context.deviceId
```

### Cluster Configuration

Define initial state for all clusters your device supports:

```typescript
clusters: {
  onOff: {
    onOff: false,  // Boolean: true = on, false = off
  },
  levelControl: {
    currentLevel: 127,  // Number: 1-254 (127 = 50%)
    minLevel: 1,        // Minimum brightness
    maxLevel: 254,      // Maximum brightness
  },
}
```

**Important notes about state persistence:**

- These values are **initial/default values only** - used when the accessory is first created
- Once created, Homebridge **automatically persists** all state changes
- On restart, Homebridge **restores the last known state**, not these initial values
- State persists across Homebridge restarts, updates, and system reboots
- This works the same way as HAP - you don't need to manually save/restore state

**Example lifecycle:**
1. First run: Accessory created with `onOff: false` (your initial value)
2. User turns light on in Home app → state becomes `onOff: true`
3. Homebridge restarts → state is still `onOff: true` (persisted)
4. Not reset to `onOff: false` (initial values are ignored after first creation)

---

## Reading and Updating State

After implementing your device, you'll need to read and update its state for both Flow A (handlers) and Flow B (external changes).

### Reading Current State

There are two ways to read cluster state:

#### Method 1: Direct Property Access (Recommended)

Access cluster attributes directly from the accessory object:

```typescript
// Read power state
const isOn = accessory.clusters.onOff.onOff // boolean

// Read brightness
const level = accessory.clusters.levelControl.currentLevel // 1-254
const percent = Math.round((level / 254) * 100) // Convert to percentage

// Read color
const hue = accessory.clusters.colorControl.currentHue // 0-254
const saturation = accessory.clusters.colorControl.currentSaturation // 0-254
```

**When to use**: This is the recommended approach in most cases when you have a reference to the accessory object.

**Benefits**:
- ✅ Simple and direct
- ✅ TypeScript autocomplete works well
- ✅ No additional function call overhead
- ✅ Used in all official examples

#### Method 2: API Method (Special Cases)

Use the API method when you don't have a reference to the accessory object:

```typescript
// Read state by UUID
const state = api.matter.getAccessoryState(uuid, api.matter.clusterNames.OnOff)
if (state) {
  const isOn = state.onOff // boolean
}

// Read brightness
const levelState = api.matter.getAccessoryState(uuid, api.matter.clusterNames.LevelControl)
if (levelState) {
  const level = levelState.currentLevel // 1-254
}
```

**When to use**:
- When you only have the UUID (not the accessory object)
- After plugin restart when you need to read state but lost local variables
- When multiple parts of code need to access the same accessory state
- For debugging and logging utilities

**Note**: Returns `undefined` if the accessory or cluster is not found.

### Updating State

Use `updateAccessoryState()` to manually update cluster attributes:

```typescript
api.matter.updateAccessoryState(
  accessory.uuid, // UUID of the accessory
  api.matter.clusterNames.OnOff, // Cluster name (use constants!)
  { onOff: true } // New attribute values
)
```

**When to use**:

1. **External changes (Flow B)** - When your physical device changes state externally (most common use case)
2. **Side effects in handlers** - When a handler needs to update OTHER attributes as a side effect

**IMPORTANT - What NOT to do**:
- ❌ **Never update the same attribute that the handler is already updating**

  For example, in an `on()` handler, don't manually update `onOff` - it's automatically updated by Homebridge.

**Valid example - Side effect updates**:

If your physical light always resets to 100% brightness when turned on:

```typescript
handlers: {
  onOff: {
    on: async () => {
      await myLightAPI.turnOn()

      // ✅ VALID: Update brightness as a side effect
      // The light physically resets to 100%, so update Matter to match
      api.matter.updateAccessoryState(
        accessory.uuid,
        api.matter.clusterNames.LevelControl,
        { currentLevel: 254 }  // 100% brightness
      )

      // ❌ WRONG: Don't update onOff - it's automatically updated
      // api.matter.updateAccessoryState(
      //   accessory.uuid,
      //   api.matter.clusterNames.OnOff,
      //   { onOff: true }  // Redundant and unnecessary
      // )
    },
  },
}
```

### Available Cluster Names

Use these constants with `updateAccessoryState()` and `getAccessoryState()` for type safety:

```typescript
// Common examples
api.matter.clusterNames.OnOff
api.matter.clusterNames.LevelControl
api.matter.clusterNames.ColorControl
api.matter.clusterNames.Thermostat
// ... see full list below
```

<details>
<summary><strong>Click to see all available cluster names</strong></summary>

#### Control Clusters
```typescript
api.matter.clusterNames.OnOff
api.matter.clusterNames.LevelControl
api.matter.clusterNames.ColorControl
api.matter.clusterNames.DoorLock
api.matter.clusterNames.WindowCovering
api.matter.clusterNames.Thermostat
api.matter.clusterNames.FanControl
```

#### Sensor Clusters
```typescript
api.matter.clusterNames.TemperatureMeasurement
api.matter.clusterNames.RelativeHumidityMeasurement
api.matter.clusterNames.IlluminanceMeasurement
api.matter.clusterNames.OccupancySensing
api.matter.clusterNames.BooleanState
api.matter.clusterNames.SmokeCoAlarm
```

#### Robotic Vacuum Cleaner Clusters
```typescript
api.matter.clusterNames.RvcRunMode
api.matter.clusterNames.RvcOperationalState
api.matter.clusterNames.RvcCleanMode
```

#### Pump & Other
```typescript
api.matter.clusterNames.PumpConfigurationAndControl
```

#### Identification
```typescript
api.matter.clusterNames.Identify
```

#### Device Information (Read-Only)
These are set during registration and cannot be updated:
```typescript
api.matter.clusterNames.BasicInformation
api.matter.clusterNames.BridgedDeviceBasicInformation
```

</details>

### Updating Multiple Properties

Update each cluster separately:

```typescript
// Update power state
api.matter.updateAccessoryState(
  accessory.uuid,
  api.matter.clusterNames.OnOff,
  { onOff: true }
)

// Update brightness
api.matter.updateAccessoryState(
  accessory.uuid,
  api.matter.clusterNames.LevelControl,
  { currentLevel: 200 }
)

// Update multiple attributes in same cluster
api.matter.updateAccessoryState(
  accessory.uuid,
  api.matter.clusterNames.ColorControl,
  {
    currentHue: 180,
    currentSaturation: 254,
    colorMode: api.matter.types.ColorControl.ColorMode.CurrentHueAndCurrentSaturation
  }
)
```

---

## Monitoring External Changes

To implement Flow B (physical device → Home app), you must monitor your physical device and call `updateAccessoryState()` when it changes externally.

There are two approaches:

### Recommended: Event-Based Updates

Use this when your device supports push notifications (MQTT, WebSocket, webhooks, SSE).

**Advantages**:
- ✅ Instant updates
- ✅ More efficient
- ✅ Better user experience
- ✅ Lower overhead

#### MQTT Example

```typescript
import mqtt from 'mqtt'

const mqttClient = mqtt.connect('mqtt://broker-url')

mqttClient.subscribe('home/light-001/status')
mqttClient.on('message', (topic, message) => {
  if (topic === 'home/light-001/status') {
    const deviceState = JSON.parse(message.toString())
    const deviceIsOn = deviceState.state === 'ON'

    // Compare with current Matter state
    const currentMatterState = accessory.clusters.onOff.onOff

    if (deviceIsOn !== currentMatterState) {
      log.info(`Device changed: ${deviceIsOn ? 'ON' : 'OFF'}`)

      // Update Matter state
      api.matter.updateAccessoryState(
        accessory.uuid,
        api.matter.clusterNames.OnOff,
        { onOff: deviceIsOn }
      )
    }
  }
})
```

#### WebSocket Example

```typescript
import WebSocket from 'ws'

const ws = new WebSocket('wss://api.example.com/devices/light-001/events')

ws.on('message', (data) => {
  const event = JSON.parse(data.toString())

  if (event.type === 'state_changed') {
    const deviceIsOn = event.state === 'ON'
    const currentMatterState = accessory.clusters.onOff.onOff

    if (deviceIsOn !== currentMatterState) {
      api.matter.updateAccessoryState(
        accessory.uuid,
        api.matter.clusterNames.OnOff,
        { onOff: deviceIsOn }
      )
    }
  }
})

// Handle reconnection
ws.on('close', () => {
  log.warn('WebSocket disconnected, reconnecting in 5s...')
  setTimeout(() => startWebSocket(), 5000)
})
```

#### Webhook Example

```typescript
import express from 'express'

const app = express()
app.use(express.json())

app.post('/webhook/light-001/state', (req, res) => {
  const deviceIsOn = req.body.state === 'ON'
  const currentMatterState = accessory.clusters.onOff.onOff

  if (deviceIsOn !== currentMatterState) {
    api.matter.updateAccessoryState(
      accessory.uuid,
      api.matter.clusterNames.OnOff,
      { onOff: deviceIsOn }
    )
  }

  res.sendStatus(200)
})

app.listen(3000)
```

### Fallback: Polling-Based Updates

Use this **only** if your device doesn't support events.

**Disadvantages**:
- ⚠️ Delayed updates (depends on interval)
- ⚠️ Higher network overhead
- ⚠️ Can strain device APIs
- ⚠️ Use 5-10 second intervals minimum

```typescript
setInterval(async () => {
  try {
    // Fetch state from physical device
    const response = await fetch('https://api.example.com/devices/light-001/state')
    const data = await response.json()
    const deviceIsOn = data.state === 'ON'

    // Compare with current Matter state
    const currentMatterState = accessory.clusters.onOff.onOff

    // Only update if changed (avoid unnecessary updates)
    if (deviceIsOn !== currentMatterState) {
      log.info(`Device changed (polling): ${deviceIsOn ? 'ON' : 'OFF'}`)

      api.matter.updateAccessoryState(
        accessory.uuid,
        api.matter.clusterNames.OnOff,
        { onOff: deviceIsOn }
      )
    }
  } catch (error) {
    log.error(`Error polling device: ${error}`)
  }
}, 5000) // Poll every 5 seconds
```

---

## Using Matter Types

Homebridge provides access to all Matter.js cluster types via `api.matter.types`. This gives you type-safe access to enums, types, and constants.

### Accessing Types

Matter types are available directly on the API - no imports needed:

```typescript
// Use types with cluster names for type-safe updates
api.matter.updateAccessoryState(
  uuid,
  api.matter.clusterNames.FanControl,
  { fanMode: api.matter.types.FanControl.FanMode.High }
)

// Everything is under api.matter
api.matter.updateAccessoryState(
  uuid,
  api.matter.clusterNames.Thermostat,
  { systemMode: api.matter.types.Thermostat.SystemMode.Heat }
)
```

**Consistent API Pattern**:
- `api.matter.deviceTypes.*` - Device type definitions
- `api.matter.clusterNames.*` - Cluster name constants (strings)
- `api.matter.types.*` - Matter.js type definitions and enums
- All accessible from `api.matter` - no separate imports required

### Discovering Available Values

Three ways to discover enum values:

1. **TypeScript Autocomplete**: Type `api.matter.types.FanControl.` and see suggestions
2. **Matter.js Reference**: https://github.com/project-chip/matter.js
3. **Matter Specification**: https://csa-iot.org/developer-resource/specifications-download-request/

### All Available Clusters

Matter types provides access to ALL 130+ Matter clusters:

```typescript
api.matter.types.FanControl
api.matter.types.Thermostat
api.matter.types.DoorLock
api.matter.types.ColorControl
api.matter.types.WindowCovering
api.matter.types.SmokeCoAlarm
api.matter.types.OccupancySensing
api.matter.types.TemperatureMeasurement
// ... and 120+ more!
```

---

## Best Practices

### 1. Always Compare Before Updating

Avoid unnecessary updates by checking if state actually changed:

```typescript
const currentState = accessory.clusters.onOff.onOff
if (newState !== currentState) {
  api.matter.updateAccessoryState(...)
}
```

### 2. Use Events Over Polling

Whenever possible, use event-based updates (MQTT, WebSocket, webhooks) instead of polling for better performance and user experience.

### 3. Don't Update the Same Attribute in Handlers

Handlers automatically update their own attribute. Only manually update OTHER attributes (side effects) or for external changes (Flow B).

```typescript
// ❌ WRONG - Redundant update
handlers: {
  onOff: {
    on: async () => {
      await myDevice.turnOn()
      api.matter.updateAccessoryState(uuid, api.matter.clusterNames.OnOff, { onOff: true })
      // Redundant! onOff is already updated automatically
    }
  }
}

// ✅ CORRECT - No manual update needed
handlers: {
  onOff: {
    on: async () => {
      await myDevice.turnOn()
      // State automatically updated
    }
  }
}

// ✅ ALSO CORRECT - Update different attribute as side effect
handlers: {
  onOff: {
    on: async () => {
      await myDevice.turnOn()
      // Light resets to 100% when turned on, so update brightness too
      api.matter.updateAccessoryState(uuid, api.matter.clusterNames.LevelControl, { currentLevel: 254 })
    }
  }
}
```

### 4. Handle Errors Gracefully

Always throw errors from handlers so the Home app can be notified of failures:

```typescript
handlers: {
  onOff: {
    on: async () => {
      try {
        // Control your physical device
        await myDevice.turnOn()
        log.info('Successfully turned on device')
      } catch (error) {
        // Log the error for debugging
        log.error(`Failed to turn on device: ${error}`)

        // ✅ IMPORTANT: Re-throw the error
        // This propagates the error to the Matter protocol, which:
        // 1. Notifies the Home app that the command failed
        // 2. Prevents state from updating incorrectly
        // 3. Shows an error message to the user
        throw error
      }
    },

    off: async () => {
      try {
        await myDevice.turnOff()
        log.info('Successfully turned off device')
      } catch (error) {
        log.error(`Failed to turn off device: ${error}`)
        throw error  // Always re-throw!
      }
    },
  },
}
```

**Why throw errors?**

Without throwing:
- ❌ Home app thinks command succeeded
- ❌ State updates incorrectly (shows "on" when device is actually off)
- ❌ User has no feedback that something went wrong

With throwing:
- ✅ Home app displays error to user
- ✅ State remains unchanged (accurate)
- ✅ User knows to try again or investigate the issue

### 5. Log Clearly

Distinguish between the two flows in your logs:

```typescript
log.info('[Device] Home app → Physical device: Turning ON')
log.info('[Device] Physical device → Home app: State changed to ON')
```

### 6. Use Cluster Name Constants

Always use `api.matter.clusterNames.*` constants instead of strings:

```typescript
// ✅ CORRECT
api.matter.updateAccessoryState(uuid, api.matter.clusterNames.OnOff, {...})

// ❌ WRONG
api.matter.updateAccessoryState(uuid, 'onOff', {...})
```

---

## API Reference

Complete reference for all Matter API methods and properties available in Homebridge.

### Platform API Methods

#### `api.isMatterAvailable(): boolean`

Check if Matter is available in the current version of Homebridge.

**Returns:** `true` if Homebridge version is >= 2.0.0-alpha.0

**Usage:**
```typescript
if (api.isMatterAvailable()) {
  log.info('Matter is available in this Homebridge version')
} else {
  log.warn('Matter requires Homebridge >= 2.0.0-alpha.0')
}
```

**When to use:**
- Plugin compatibility checks
- Conditional feature loading
- Version-specific functionality

---

#### `api.isMatterEnabled(): boolean`

Check if Matter is enabled for this bridge instance.

**Returns:** `true` if Matter is enabled in the bridge configuration

**Configuration:**
- For main bridge: Set `bridge.matter = true` in config.json
- For child bridge: Set `_bridge.matter = true` in platform config

**Usage:**
```typescript
if (api.isMatterEnabled()) {
  // Register Matter accessories
  api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
} else {
  log.info('Matter is not enabled for this bridge')
}
```

**When to use:**
- Runtime checks before registering Matter accessories
- Conditional accessory registration
- User feedback about Matter status

---

### Matter API Properties

All properties are accessed via `api.matter.*`

#### `api.matter.uuid`

UUID generator for creating unique accessory identifiers (alias of `api.hap.uuid`).

**Type:** `HAP['uuid']`

**Methods:**
- `generate(data: string): string` - Generate deterministic UUID from string
- `isValid(uuid: string): boolean` - Validate UUID format

**Usage:**
```typescript
const uuid = api.matter.uuid.generate('my-light-123')
// Output: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'

if (api.matter.uuid.isValid(uuid)) {
  // UUID is valid
}
```

**Important:**
- UUIDs must be deterministic (same input = same output)
- Use unique identifiers (device ID, MAC address, etc.)
- UUIDs persist across restarts for state restoration

---

#### `api.matter.deviceTypes`

Available Matter device types for creating accessories.

**Type:** `typeof deviceTypes` (from Matter.js)

**Common Device Types:**
- Lighting: `OnOffLight`, `DimmableLight`, `ColorTemperatureLight`, `ExtendedColorLight`
- Switches & Outlets: `OnOffSwitch`, `OnOffOutlet`
- Sensors: `ContactSensor`, `TemperatureSensor`, `HumiditySensor`, `OccupancySensor`, etc.
- HVAC: `Thermostat`, `Fan`
- Closure: `DoorLock`, `WindowCovering`
- Robotic: `RoboticVacuumCleaner`

**Usage:**
```typescript
const accessory = {
  uuid: api.matter.uuid.generate('my-light'),
  displayName: 'Living Room Light',
  deviceType: api.matter.deviceTypes.DimmableLight,
  // ...
}
```

**See:** [Available Device Types](#available-device-types) for complete list

---

#### `api.matter.clusters`

Direct access to Matter.js cluster definitions for advanced use cases.

**Type:** `typeof clusters` (from Matter.js)

**Usage:**
```typescript
// Access cluster attributes programmatically
const onOffAttrs = api.matter.clusters.OnOffCluster.attributes
console.log(Object.keys(onOffAttrs))
// Output: ['onOff', 'clusterRevision', 'featureMap', ...]

// Check if cluster supports specific features
const levelControlFeatures = api.matter.clusters.LevelControlCluster.features
```

**When to use:**
- Advanced cluster introspection
- Dynamic attribute discovery
- Custom cluster implementations

**Note:** Most plugins should use the higher-level APIs instead.

---

#### `api.matter.clusterNames`

Cluster name constants for type safety and autocomplete with state methods.

**Type:** `typeof clusterNames`

**Available Names:**
- `OnOff`, `LevelControl`, `ColorControl`
- `DoorLock`, `WindowCovering`
- `Thermostat`, `FanControl`
- `TemperatureMeasurement`, `RelativeHumidityMeasurement`
- And many more...

**Usage:**
```typescript
// Type-safe cluster references
api.matter.updateAccessoryState(
  uuid,
  api.matter.clusterNames.OnOff, // Autocomplete available!
  { onOff: true }
)

const state = api.matter.getAccessoryState(
  uuid,
  api.matter.clusterNames.LevelControl
)
```

**Benefits:**
- Autocomplete in IDEs
- Compile-time error checking
- Prevents typos in cluster names

---

#### `api.matter.types`

Type-safe enum values for cluster attributes (modes, states, etc.).

**Type:** `typeof MatterTypes` (from Homebridge)

**Common Types:**
- `DoorLock.LockState` - Lock states (Locked, Unlocked, etc.)
- `DoorLock.LockType` - Lock types (DeadBolt, Magnetic, etc.)
- `FanControl.FanMode` - Fan modes (Off, Low, Medium, High, Auto, etc.)
- `FanControl.FanModeSequence` - Supported mode sequences
- `Thermostat.SystemMode` - HVAC modes (Off, Heat, Cool, Auto, etc.)
- `ColorControl.ColorMode` - Color modes (HS, XY, ColorTemperature)
- `RvcRunMode.ModeTag` - Vacuum run mode tags (Idle, Cleaning, Mapping)
- `RvcCleanMode.ModeTag` - Vacuum clean mode tags (Vacuum, Mop)
- `RvcOperationalState.OperationalState` - Vacuum states (Stopped, Running, Docked, etc.)

**Usage:**
```typescript
// Door lock states
clusters: {
  doorLock: {
    lockState: api.matter.types.DoorLock.LockState.Unlocked,
    lockType: api.matter.types.DoorLock.LockType.DeadBolt
  }
}

// Fan modes
clusters: {
  fanControl: {
    fanMode: api.matter.types.FanControl.FanMode.Auto,
    fanModeSequence: api.matter.types.FanControl.FanModeSequence.OffLowMedHigh
  }
}

// Color modes
clusters: {
  colorControl: {
    colorMode: api.matter.types.ColorControl.ColorMode.ColorTemperatureMireds
  }
}
```

**Benefits:**
- Type safety prevents invalid values
- IDE autocomplete shows available options
- Self-documenting code
- Compile-time validation

**See:** [Using Matter Types](#using-matter-types) for detailed examples

---

### Matter API Methods

#### `api.matter.registerPlatformAccessories()`

Register Matter accessories with the platform (standard registration method).

**Signature:**
```typescript
registerPlatformAccessories(
  pluginIdentifier: string,
  platformName: string,
  accessories: MatterAccessory[]
): void
```

**Parameters:**
- `pluginIdentifier` - Plugin identifier (e.g., `'homebridge-example'`)
- `platformName` - Platform name (e.g., `'ExamplePlatform'`)
- `accessories` - Array of Matter accessories to register

**Usage:**
```typescript
const PLUGIN_NAME = 'homebridge-example'
const PLATFORM_NAME = 'ExamplePlatform'

const accessories = [
  {
    uuid: api.matter.uuid.generate('my-light'),
    displayName: 'Living Room Light',
    deviceType: api.matter.deviceTypes.OnOffLight,
    // ...
  }
]

api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
```

**When to use:**
- Standard accessory registration
- Multiple accessories on shared bridge
- Most common use case

**See also:** `publishExternalAccessories()` for isolated accessories

---

#### `api.matter.unregisterPlatformAccessories()`

Unregister Matter accessories by UUID.

**Signature:**
```typescript
unregisterPlatformAccessories(
  pluginIdentifier: string,
  platformName: string,
  accessories: MatterAccessory[]
): void
```

**Parameters:**
- `pluginIdentifier` - Plugin identifier
- `platformName` - Platform name
- `accessories` - Array of accessories to unregister (only `uuid` is required)

**Usage:**
```typescript
// Unregister accessories
const accessoriesToRemove = [
  { uuid: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX' }
]

api.matter.unregisterPlatformAccessories(
  PLUGIN_NAME,
  PLATFORM_NAME,
  accessoriesToRemove
)
```

**When to use:**
- Removing accessories from Homebridge
- Cleanup during plugin shutdown
- User-initiated accessory removal

---

#### `api.matter.publishExternalAccessories()`

Publish accessories on dedicated Matter bridges (isolated from other accessories).

**Signature:**
```typescript
publishExternalAccessories(
  pluginIdentifier: string,
  accessories: MatterAccessory[]
): void
```

**Parameters:**
- `pluginIdentifier` - Plugin identifier
- `accessories` - Array of accessories to publish externally

**Usage:**
```typescript
const accessories = [
  {
    uuid: api.matter.uuid.generate('robot-vacuum'),
    displayName: 'Robot Vacuum',
    deviceType: api.matter.deviceTypes.RoboticVacuumCleaner,
    // ...
  }
]

// Publish on dedicated bridge
api.matter.publishExternalAccessories(PLUGIN_NAME, accessories)
```

**When to use:**
- Robotic Vacuum Cleaners (required by Apple Home)
- Cameras and video doorbells
- Devices requiring isolation
- Testing single accessories

**Behavior:**
- Each accessory gets its own Matter server instance
- Separate port allocation (e.g., 5541, 5542, etc.)
- Independent QR codes for commissioning
- Complete isolation from other accessories

**Similar to:** HAP's `api.publishExternalAccessories()`

---

#### `api.matter.updateAccessoryState()`

Update accessory cluster state when device changes externally (Flow B).

**Signature:**
```typescript
updateAccessoryState(
  uuid: string,
  cluster: string,
  attributes: Record<string, any>
): void
```

**Parameters:**
- `uuid` - Accessory UUID
- `cluster` - Cluster name (use `api.matter.clusterNames.*`)
- `attributes` - Attributes to update (key-value pairs)

**Usage:**
```typescript
// Device turned on via native app
api.matter.updateAccessoryState(
  uuid,
  api.matter.clusterNames.OnOff,
  { onOff: true }
)

// Brightness changed via physical button
api.matter.updateAccessoryState(
  uuid,
  api.matter.clusterNames.LevelControl,
  { currentLevel: 200 }
)

// Update multiple attributes at once
api.matter.updateAccessoryState(
  uuid,
  api.matter.clusterNames.ColorControl,
  {
    colorMode: api.matter.types.ColorControl.ColorMode.ColorTemperatureMireds,
    colorTemperatureMireds: 250
  }
)
```

**IMPORTANT:**
- ❌ **DO NOT** use inside handlers (state updates automatically)
- ✅ **DO** use for external changes (webhooks, polling, events)

**When to use:**
- Native app controls
- Physical button presses
- Webhook notifications
- Polling results
- MQTT/WebSocket messages

**See:** [Flow B: Physical Device → Home App](#flow-b-physical-device--home-app-manual)

---

#### `api.matter.getAccessoryState()`

Get current cluster state from a Matter accessory.

**Signature:**
```typescript
getAccessoryState(
  uuid: string,
  cluster: string
): Record<string, any> | undefined
```

**Parameters:**
- `uuid` - Accessory UUID
- `cluster` - Cluster name (use `api.matter.clusterNames.*`)

**Returns:**
- Object with current attribute values, or `undefined` if not found

**Usage:**
```typescript
// Read OnOff state
const state = api.matter.getAccessoryState(uuid, api.matter.clusterNames.OnOff)
if (state?.onOff) {
  log.info('Light is currently on')
}

// Read level control state
const levelState = api.matter.getAccessoryState(
  uuid,
  api.matter.clusterNames.LevelControl
)
log.info(`Current brightness: ${levelState?.currentLevel}`)

// Check color mode
const colorState = api.matter.getAccessoryState(
  uuid,
  api.matter.clusterNames.ColorControl
)
if (colorState?.colorMode === api.matter.types.ColorControl.ColorMode.ColorTemperatureMireds) {
  log.info(`Color temp: ${colorState.colorTemperatureMireds} mireds`)
}
```

**When to use:**
- Reading state after plugin restart
- Verifying current state before changes
- Debugging and logging
- Conditional logic based on state

**Note:** State is persisted across restarts automatically.

---

## Additional Resources

- **Matter.js Documentation**: https://github.com/project-chip/matter.js
- **Matter Specification**: https://csa-iot.org/developer-resource/specifications-download-request/
- **Homebridge Documentation**: https://developers.homebridge.io
- **Example Devices**: See the `src/devices/` directory for complete working examples

---

## Appendix: Common Attribute Value Types

| Type        | Range/Format              | Common Uses                          | Notes                                    |
|-------------|---------------------------|--------------------------------------|------------------------------------------|
| Boolean     | `true`, `false`           | Power states, binary sensors         | Simple on/off values                     |
| Uint8       | 0-254                     | Brightness, hue, saturation          | 0 often reserved, 254 = 100%             |
| Uint16      | 0-65535                   | Color XY values, extended ranges     | Full 16-bit range                        |
| Enum        | Varies                    | Modes, states                        | Use `api.matter.types` for type safety   |
| Temperature | Hundredths of degrees C   | Thermostat, temperature sensors      | 2500 = 25.00°C                           |
| Percentage  | 0-100 or 0-254            | Sensors (0-100), Controls (0-254)    | Check device spec for range              |
| Mireds      | 147-454                   | Color temperature                    | Reciprocal megakelvin: 1000000 / kelvin  |

---

## Appendix: Value Conversion Formulas

### Brightness (Matter ↔ Percentage)

```typescript
// To Matter (1-254)
const matterLevel = Math.max(1, Math.round((percent / 100) * 254))

// From Matter (to 0-100%)
const percent = Math.round((matterLevel / 254) * 100)
```

### Hue (Matter ↔ Degrees)

```typescript
// To Matter (0-254)
const matterHue = Math.round((degrees / 360) * 254)

// From Matter (to 0-360°)
const degrees = Math.round((matterHue / 254) * 360)
```

### Saturation (Matter ↔ Percentage)

```typescript
// To Matter (0-254)
const matterSat = Math.round((percent / 100) * 254)

// From Matter (to 0-100%)
const percent = Math.round((matterSat / 254) * 100)
```

### Color Temperature (Mireds ↔ Kelvin)

```typescript
// To Mireds
const mireds = Math.round(1000000 / kelvin)

// From Mireds
const kelvin = Math.round(1000000 / mireds)
```

### XY Color (Matter ↔ Float)

```typescript
// To Matter (0-65535)
const matterX = Math.round(floatX * 65535)
const matterY = Math.round(floatY * 65535)

// From Matter (to 0.0-1.0)
const floatX = matterX / 65535
const floatY = matterY / 65535
```

### Temperature (Matter ↔ Celsius)

```typescript
// To Matter (hundredths)
const matterTemp = Math.round(celsius * 100)

// From Matter
const celsius = matterTemp / 100
```

---

## Device Reference

This section documents all available Matter device types with their clusters, attributes, handlers, and usage examples.

### On/Off Light

| Property                 | Value                                                  |
|--------------------------|--------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.OnOffLight`                    |
| **Description**          | A lighting device capable of being switched on or off. |
| **Matter Specification** | § 4.1                                                  |

#### Required Clusters

###### `OnOff` Cluster

Controls the power state of the light.

**Attributes**:

```typescript
// All OnOff cluster attributes via api.matter
const onOffAttrs = api.matter.clusters.OnOffCluster.attributes
console.log(Object.keys(onOffAttrs))
// Output: ['onOff', 'clusterRevision', 'featureMap', ...]
```

| Attribute | Type    | Range/Values    | Description                      |
|-----------|---------|-----------------|----------------------------------|
| `onOff`   | boolean | `true`, `false` | Power state (true=on, false=off) |

**Reading State**:

```typescript
const isOn = accessory.clusters.onOff.onOff
```

<details>
<summary><strong>Handlers</strong></summary>

```typescript
handlers: {
  onOff: {
    /**
     * Called when user turns light ON via Home app
     */
    on: async () => {
      // Control your physical device
      await myLightAPI.turnOn()
      // State automatically updated by Homebridge
    },

    /**
     * Called when user turns light OFF via Home app
     */
    off: async () => {
      // Control your physical device
      await myLightAPI.turnOff()
      // State automatically updated by Homebridge
    },
  },
}
```

</details>

### Dimmable Light

| Property                 | Value                                                  |
|--------------------------|--------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.DimmableLight`                 |
| **Description**          | A lighting device with on/off and brightness control.  |
| **Matter Specification** | § 4.2                                                  |

#### Required Clusters

###### `OnOff` Cluster

Controls the power state of the light.

**Attributes**:

| Attribute | Type    | Range/Values    | Description                      |
|-----------|---------|-----------------|----------------------------------|
| `onOff`   | boolean | `true`, `false` | Power state (true=on, false=off) |

**Reading State**:

```typescript
const isOn = accessory.clusters.onOff.onOff
```

###### `LevelControl` Cluster

Controls the brightness level of the light.

**Attributes**:

```typescript
// All LevelControl cluster attributes via api.matter
const levelAttrs = api.matter.clusters.LevelControlCluster.attributes
console.log(Object.keys(levelAttrs))
// Output: ['currentLevel', 'minLevel', 'maxLevel', 'onLevel', 'options', ...]
```

| Attribute      | Type   | Range/Values | Description                                      |
|----------------|--------|--------------|--------------------------------------------------|
| `currentLevel` | number | 1-254        | Current brightness (1 = 0.4%, 254 = 100%)        |
| `minLevel`     | number | 1-254        | Minimum brightness level                         |
| `maxLevel`     | number | 1-254        | Maximum brightness level                         |
| `onLevel`      | number | 0-254        | Brightness when turned on (0 = restore previous) |

**Reading State**:

```typescript
const level = accessory.clusters.levelControl.currentLevel
const brightnessPercent = Math.round((level / 254) * 100)
```

<details>
<summary><strong>Handlers</strong></summary>

```typescript
handlers: {
  onOff: {
    on: async () => {
      log.info('[Dimmable Light] Turning ON')
      await myLightAPI.turnOn()
    },

    off: async () => {
      log.info('[Dimmable Light] Turning OFF')
      await myLightAPI.turnOff()
    },
  },

  levelControl: {
    /**
     * Called when user adjusts brightness via Home app
     * Also called when turning on with specific brightness
     */
    moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
      const { level, transitionTime } = request
      const brightnessPercent = Math.round((level / 254) * 100)

      log.info(`[Dimmable Light] Setting brightness to ${brightnessPercent}%`)
      await myLightAPI.setBrightness(brightnessPercent, transitionTime)
    },
  },
}
```

</details>

---

### Color Temperature Light

| Property                 | Value                                                                     |
|--------------------------|---------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.ColorTemperatureLight`                            |
| **Description**          | A lighting device with on/off, brightness, and color temperature control. |
| **Matter Specification** | § 4.3                                                                     |

#### Required Clusters

###### `OnOff` Cluster

Controls the power state of the light.

**Attributes**:

| Attribute | Type    | Range/Values    | Description                      |
|-----------|---------|-----------------|----------------------------------|
| `onOff`   | boolean | `true`, `false` | Power state (true=on, false=off) |

###### `LevelControl` Cluster

Controls the brightness level of the light.

**Attributes**:

| Attribute      | Type   | Range/Values | Description                                      |
|----------------|--------|--------------|--------------------------------------------------|
| `currentLevel` | number | 1-254        | Current brightness (1 = 0.4%, 254 = 100%)        |
| `minLevel`     | number | 1-254        | Minimum brightness level                         |
| `maxLevel`     | number | 1-254        | Maximum brightness level                         |

###### `ColorControl` Cluster

Controls the color temperature of the light.

**Attributes**:

```typescript
// All ColorControl cluster attributes via api.matter
const colorAttrs = api.matter.clusters.ColorControlCluster.attributes
console.log(Object.keys(colorAttrs))
```

| Attribute                       | Type   | Range/Values | Description                                           |
|---------------------------------|--------|--------------|-------------------------------------------------------|
| `colorMode`                     | number | 0-2          | Current color mode (2 = Color Temperature)            |
| `colorTemperatureMireds`        | number | 147-454      | Color temp in mireds (reciprocal megakelvin)          |
| `colorTempPhysicalMinMireds`    | number | 147-500      | Coolest temperature supported (e.g., 147 = ~6800K)    |
| `colorTempPhysicalMaxMireds`    | number | 147-500      | Warmest temperature supported (e.g., 454 = ~2200K)    |

**Reading State**:

```typescript
const mireds = accessory.clusters.colorControl.colorTemperatureMireds
const kelvin = Math.round(1000000 / mireds)
```

**Value Conversions**:

```typescript
// Kelvin to Mireds
const mireds = Math.round(1000000 / kelvin)

// Mireds to Kelvin
const kelvin = Math.round(1000000 / mireds)
```

<details>
<summary><strong>Handlers</strong></summary>

```typescript
handlers: {
  onOff: {
    on: async () => {
      log.info('[CCT Light] Turning ON')
      await myLightAPI.turnOn()
    },

    off: async () => {
      log.info('[CCT Light] Turning OFF')
      await myLightAPI.turnOff()
    },
  },

  levelControl: {
    moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
      const { level } = request
      const brightnessPercent = Math.round((level / 254) * 100)

      log.info(`[CCT Light] Setting brightness to ${brightnessPercent}%`)
      await myLightAPI.setBrightness(brightnessPercent)
    },
  },

  colorControl: {
    /**
     * Called when user adjusts color temperature via Home app
     */
    moveToColorTemperatureLogic: async (request: { targetMireds: number, transitionTime: number }) => {
      const { targetMireds, transitionTime } = request
      const kelvin = Math.round(1000000 / targetMireds)

      log.info(`[CCT Light] Setting color temp to ${kelvin}K (${targetMireds} mireds)`)
      await myLightAPI.setColorTemperature(kelvin, transitionTime)
    },
  },
}
```

</details>

---

### Color Light

| Property                 | Value                                                                          |
|--------------------------|--------------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.ExtendedColorLight`                                    |
| **Description**          | A lighting device with on/off, brightness, and color (Hue/Saturation) control. |
| **Matter Specification** | § 4.4                                                                          |

#### Required Clusters

###### `OnOff` Cluster

Controls the power state of the light.

**Attributes**:

| Attribute | Type    | Range/Values    | Description                      |
|-----------|---------|-----------------|----------------------------------|
| `onOff`   | boolean | `true`, `false` | Power state (true=on, false=off) |

###### `LevelControl` Cluster

Controls the brightness level of the light.

**Attributes**:

| Attribute      | Type   | Range/Values | Description                                      |
|----------------|--------|--------------|--------------------------------------------------|
| `currentLevel` | number | 1-254        | Current brightness (1 = 0.4%, 254 = 100%)        |
| `minLevel`     | number | 1-254        | Minimum brightness level                         |
| `maxLevel`     | number | 1-254        | Maximum brightness level                         |

###### `ColorControl` Cluster

Controls the color (Hue/Saturation or XY) of the light.

**Attributes**:

| Attribute           | Type   | Range/Values | Description                         |
|---------------------|--------|--------------|-------------------------------------|
| `colorMode`         | number | 0-2          | Current color mode (0 = HS, 1 = XY) |
| `currentHue`        | number | 0-254        | Current hue (maps to 0-360 degrees) |
| `currentSaturation` | number | 0-254        | Current saturation (maps to 0-100%) |
| `currentX`          | number | 0-65535      | CIE 1931 x coordinate               |
| `currentY`          | number | 0-65535      | CIE 1931 y coordinate               |

**Reading State**:

```typescript
const hue = accessory.clusters.colorControl.currentHue
const saturation = accessory.clusters.colorControl.currentSaturation

// Convert to degrees/percentage
const hueDegrees = Math.round((hue / 254) * 360)
const saturationPercent = Math.round((saturation / 254) * 100)
```

**Value Conversions**:

```typescript
// Hue: Degrees (0-360) to Matter (0-254)
const matterHue = Math.round((degrees / 360) * 254)
const degrees = Math.round((matterHue / 254) * 360)

// Saturation: Percent (0-100) to Matter (0-254)
const matterSat = Math.round((percent / 100) * 254)
const percent = Math.round((matterSat / 254) * 100)

// XY: Float (0.0-1.0) to Matter (0-65535)
const matterX = Math.round(floatX * 65535)
const floatX = matterX / 65535
```

<details>
<summary><strong>Handlers</strong></summary>

```typescript
handlers: {
  onOff: {
    on: async () => {
      log.info('[Color Light] Turning ON')
      await myLightAPI.turnOn()
    },

    off: async () => {
      log.info('[Color Light] Turning OFF')
      await myLightAPI.turnOff()
    },
  },

  levelControl: {
    moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
      const { level } = request
      const brightnessPercent = Math.round((level / 254) * 100)

      log.info(`[Color Light] Setting brightness to ${brightnessPercent}%`)
      await myLightAPI.setBrightness(brightnessPercent)
    },
  },

  colorControl: {
    /**
     * Called when user adjusts color via XY coordinates in Home app
     */
    moveToColorLogic: async (request: { targetX: number, targetY: number, transitionTime: number }) => {
      const { targetX, targetY, transitionTime } = request
      const xFloat = (targetX / 65535).toFixed(4)
      const yFloat = (targetY / 65535).toFixed(4)

      log.info(`[Color Light] Setting XY color to (${xFloat}, ${yFloat})`)
      await myLightAPI.setColorXY(xFloat, yFloat, transitionTime)
    },

    /**
     * Called when user adjusts color via Hue/Saturation in Home app
     */
    moveToHueAndSaturationLogic: async (request: { targetHue: number, targetSaturation: number, transitionTime: number }) => {
      const { targetHue, targetSaturation, transitionTime } = request
      const hueDegrees = Math.round((targetHue / 254) * 360)
      const saturationPercent = Math.round((targetSaturation / 254) * 100)

      log.info(`[Color Light] Setting color to ${hueDegrees}°, ${saturationPercent}%`)
      await myLightAPI.setColorHS(hueDegrees, saturationPercent, transitionTime)
    },
  },
}
```

</details>

---

### Extended Color Light

| Property                 | Value                                                                                             |
|--------------------------|---------------------------------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.ExtendedColorLight`                                                       |
| **Description**          | A lighting device with on/off, brightness, color (Hue/Saturation), and color temperature control. |
| **Matter Specification** | § 4.4                                                                                             |

#### Required Clusters

###### `OnOff` Cluster

Controls the power state of the light.

**Attributes**:

| Attribute | Type    | Range/Values    | Description                      |
|-----------|---------|-----------------|----------------------------------|
| `onOff`   | boolean | `true`, `false` | Power state (true=on, false=off) |

###### `LevelControl` Cluster

Controls the brightness level of the light.

**Attributes**:

| Attribute      | Type   | Range/Values | Description                                      |
|----------------|--------|--------------|--------------------------------------------------|
| `currentLevel` | number | 1-254        | Current brightness (1 = 0.4%, 254 = 100%)        |
| `minLevel`     | number | 1-254        | Minimum brightness level                         |
| `maxLevel`     | number | 1-254        | Maximum brightness level                         |

###### `ColorControl` Cluster

Controls both color (Hue/Saturation or XY) and color temperature of the light.

When updating state for Extended Color Light (Flow B), always update the `colorMode` attribute along with the color/temperature values to indicate which mode is active.

**Attributes**:

| Attribute                       | Type   | Range/Values | Description                                           |
|---------------------------------|--------|--------------|-------------------------------------------------------|
| `colorMode`                     | number | 0-2          | Current color mode (0 = HS, 1 = XY, 2 = ColorTemp)    |
| `currentHue`                    | number | 0-254        | Current hue (maps to 0-360 degrees)                   |
| `currentSaturation`             | number | 0-254        | Current saturation (maps to 0-100%)                   |
| `currentX`                      | number | 0-65535      | CIE 1931 x coordinate                                 |
| `currentY`                      | number | 0-65535      | CIE 1931 y coordinate                                 |
| `colorTemperatureMireds`        | number | 147-454      | Color temp in mireds (when in ColorTemp mode)         |
| `colorTempPhysicalMinMireds`    | number | 147-500      | Coolest temperature supported                         |
| `colorTempPhysicalMaxMireds`    | number | 147-500      | Warmest temperature supported                         |

**Reading State**:

```typescript
// Check current mode
const mode = accessory.clusters.colorControl.colorMode
const ColorMode = api.matter.types.ColorControl.ColorMode

if (mode === ColorMode.CurrentHueAndCurrentSaturation || mode === ColorMode.CurrentXAndCurrentY) {
  // Light is in color mode
  const hue = accessory.clusters.colorControl.currentHue
  const sat = accessory.clusters.colorControl.currentSaturation
} else if (mode === ColorMode.ColorTemperatureMireds) {
  // Light is in white/CCT mode
  const mireds = accessory.clusters.colorControl.colorTemperatureMireds
  const kelvin = Math.round(1000000 / mireds)
}
```

<details>
<summary><strong>Handlers</strong></summary>

```typescript
handlers: {
  onOff: {
    on: async () => {
      log.info('[Extended Color Light] Turning ON')
      await myLightAPI.turnOn()
    },

    off: async () => {
      log.info('[Extended Color Light] Turning OFF')
      await myLightAPI.turnOff()
    },
  },

  levelControl: {
    moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
      const { level } = request
      const brightnessPercent = Math.round((level / 254) * 100)

      log.info(`[Extended Color Light] Setting brightness to ${brightnessPercent}%`)
      await myLightAPI.setBrightness(brightnessPercent)
    },
  },

  colorControl: {
    /**
     * Called when user adjusts color via XY coordinates in Home app
     */
    moveToColorLogic: async (request: { targetX: number, targetY: number, transitionTime: number }) => {
      const { targetX, targetY, transitionTime } = request
      const xFloat = (targetX / 65535).toFixed(4)
      const yFloat = (targetY / 65535).toFixed(4)

      log.info(`[Extended Color Light] Setting XY color to (${xFloat}, ${yFloat})`)
      await myLightAPI.setColorXY(xFloat, yFloat, transitionTime)
    },

    /**
     * Called when user adjusts color via Hue/Saturation in Home app
     */
    moveToHueAndSaturationLogic: async (request: { targetHue: number, targetSaturation: number, transitionTime: number }) => {
      const { targetHue, targetSaturation, transitionTime } = request
      const hueDegrees = Math.round((targetHue / 254) * 360)
      const saturationPercent = Math.round((targetSaturation / 254) * 100)

      log.info(`[Extended Color Light] Setting color to ${hueDegrees}°, ${saturationPercent}%`)
      await myLightAPI.setColorHS(hueDegrees, saturationPercent, transitionTime)
    },

    /**
     * Called when user adjusts color temperature via Home app
     */
    moveToColorTemperatureLogic: async (request: { targetMireds: number, transitionTime: number }) => {
      const { targetMireds, transitionTime } = request
      const kelvin = Math.round(1000000 / targetMireds)

      log.info(`[Extended Color Light] Setting color temp to ${kelvin}K (${targetMireds} mireds)`)
      await myLightAPI.setColorTemperature(kelvin, transitionTime)
    },
  },
}
```

</details>

---

### On/Off Outlet

| Property                 | Value                                                                     |
|--------------------------|---------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.OnOffOutlet`                                      |
| **Description**          | A plug-in unit (smart plug) capable of being switched on or off.          |
| **Matter Specification** | § 5.1                                                                     |

#### Required Clusters

###### `OnOff` Cluster

Controls the power state of the outlet.

**Attributes**:

| Attribute | Type    | Range/Values    | Description                      |
|-----------|---------|-----------------|----------------------------------|
| `onOff`   | boolean | `true`, `false` | Power state (true=on, false=off) |

**Reading State**:

```typescript
const isOn = accessory.clusters.onOff.onOff
```

<details>
<summary><strong>Handlers</strong></summary>

```typescript
handlers: {
  onOff: {
    /**
     * Called when user turns outlet ON via Home app
     */
    on: async () => {
      // Control your physical device
      await myOutletAPI.turnOn()
      // State automatically updated by Homebridge
    },

    /**
     * Called when user turns outlet OFF via Home app
     */
    off: async () => {
      // Control your physical device
      await myOutletAPI.turnOff()
      // State automatically updated by Homebridge
    },
  },
}
```

</details>

---

### On/Off Switch

| Property                 | Value                                                                     |
|--------------------------|---------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.OnOffSwitch`                                      |
| **Description**          | A switch capable of being switched on or off.                             |
| **Matter Specification** | § 6.1                                                                     |

#### Required Clusters

###### `OnOff` Cluster

Controls the power state of the switch.

**Attributes**:

| Attribute | Type    | Range/Values    | Description                      |
|-----------|---------|-----------------|----------------------------------|
| `onOff`   | boolean | `true`, `false` | Power state (true=on, false=off) |

**Reading State**:

```typescript
const isOn = accessory.clusters.onOff.onOff
```

<details>
<summary><strong>Handlers</strong></summary>

```typescript
handlers: {
  onOff: {
    /**
     * Called when user turns switch ON via Home app
     */
    on: async () => {
      // Control your physical device
      await mySwitchAPI.turnOn()
      // State automatically updated by Homebridge
    },

    /**
     * Called when user turns switch OFF via Home app
     */
    off: async () => {
      // Control your physical device
      await mySwitchAPI.turnOff()
      // State automatically updated by Homebridge
    },
  },
}
```

</details>
