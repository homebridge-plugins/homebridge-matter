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
9. [Custom Accessories and Advanced Patterns](#custom-accessories-and-advanced-patterns)
10. [Device Reference](#device-reference)

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

**✅ Key Point**: After your handler completes, Homebridge **automatically** updates the Matter state for most handlers. See [Updating State](#updating-state) for details on when manual updates are needed.

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
3. **Command/action handlers** - When handlers don't have a direct attribute mapping (see below)

**Understanding Automatic vs Manual Updates**:

Homebridge automatically updates state for **attribute-controlling handlers** but requires manual updates for **command/action handlers**:

- **✅ Automatic (DO NOT manually update)**:
  - Handlers that directly control an attribute: `on()`, `off()`, `moveToLevel()`, etc.
  - Homebridge knows exactly what attribute to update based on the handler name
  - Example: `on()` automatically sets `onOff` to `true`

- **⚠️ Manual Required (MUST manually update)**:
  - Command/action handlers with no direct attribute mapping: `pause()`, `resume()`, `start()`, `stop()`, etc.
  - These handlers affect state in ways Homebridge can't automatically infer
  - Example: `pause()` must manually set `operationalState` to `2` (Paused)

**Examples**:

```typescript
// ✅ Automatic update - DO NOT manually update
handlers: {
  onOff: {
    on: async () => {
      await myDeviceAPI.turnOn()
      // ✅ onOff automatically set to true by Homebridge

      // ❌ WRONG: Don't do this!
      // api.matter.updateAccessoryState(uuid, api.matter.clusterNames.OnOff, { onOff: true })
    },
  },
}

// ✅ Manual update REQUIRED for command handlers
handlers: {
  rvcOperationalState: {
    pause: async () => {
      await myVacuumAPI.pause()

      // ✅ MUST manually update - Homebridge can't infer this!
      api.matter.updateAccessoryState(
        uuid,
        api.matter.clusterNames.RvcOperationalState,
        { operationalState: 2 } // 2 = Paused
      )
    },
  },
}
```

**Side effect updates**:

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

### 3. Don't Update the Same Attribute in Handlers (for direct attribute handlers)

**Attribute-controlling handlers** (like `on()`, `off()`, `moveToLevel()`) automatically update their own attribute. Only manually update OTHER attributes (side effects) or for external changes (Flow B).

**Command/action handlers** (like `pause()`, `resume()`, `start()`) don't have automatic updates and MUST manually update state.

```typescript
// ❌ WRONG - Redundant update for attribute-controlling handler
handlers: {
  onOff: {
    on: async () => {
      await myDevice.turnOn()
      api.matter.updateAccessoryState(uuid, api.matter.clusterNames.OnOff, { onOff: true })
      // Redundant! onOff is already updated automatically
    }
  }
}

// ✅ CORRECT - No manual update needed for attribute-controlling handler
handlers: {
  onOff: {
    on: async () => {
      await myDevice.turnOn()
      // State automatically updated
    }
  }
}

// ✅ CORRECT - Manual update REQUIRED for command/action handler
handlers: {
  rvcOperationalState: {
    pause: async () => {
      await myVacuum.pause()
      // MUST manually update - no automatic inference possible
      api.matter.updateAccessoryState(uuid, api.matter.clusterNames.RvcOperationalState, { operationalState: 2 })
    }
  }
}

// ✅ CORRECT - Update different attribute as side effect
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
  attributes: Record<string, any>,
  partId?: string
): void
```

**Parameters:**
- `uuid` - Accessory UUID
- `cluster` - Cluster name (use `api.matter.clusterNames.*`)
- `attributes` - Attributes to update (key-value pairs)
- `partId` - (Optional) Part ID for composed devices with multiple endpoints

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

// Update a specific part in a composed device (e.g., outlet 2 in a power strip)
api.matter.updateAccessoryState(
  uuid,
  api.matter.clusterNames.OnOff,
  { onOff: true },
  'outlet-2'  // Part ID
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
  cluster: string,
  partId?: string
): Record<string, any> | undefined
```

**Parameters:**
- `uuid` - Accessory UUID
- `cluster` - Cluster name (use `api.matter.clusterNames.*`)
- `partId` - (Optional) Part ID for composed devices with multiple endpoints

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

// Read state from a specific part in a composed device (e.g., outlet 2 in a power strip)
const outlet2State = api.matter.getAccessoryState(
  uuid,
  api.matter.clusterNames.OnOff,
  'outlet-2'  // Part ID
)
if (outlet2State?.onOff) {
  log.info('Outlet 2 is currently on')
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

## Custom Accessories and Advanced Patterns

This section covers advanced patterns and custom accessory implementations that go beyond the standard single-service Matter devices. These examples demonstrate how to manage more complex device scenarios within the current Homebridge Matter API.

### Multi-Component Devices (Power Strip Example)

The Power Strip example demonstrates how to create a device with multiple independently controllable components (4 outlets) using Matter's composed device architecture.

**Important Note on Matter vs HAP Behavior**:
- **HAP/HomeKit**: Multiple services (e.g., 4 outlets) can appear as a **single tile** in the Home app with the "Show as Separate Tiles" toggle
- **Matter**: Each component (endpoint/part) **always appears as a separate tile** in the Home app - there is no option to combine them

This is a fundamental difference in how Matter and HomeKit architectures work. Matter uses independent endpoints for each component, while HomeKit uses services within a single accessory. Real physical Matter power strips (like Tapo P304M, j5create JSPAC4430) also show each outlet as a separate tile in the Home app.

The Homebridge Matter API supports composed devices through the `parts` array, which creates separate Matter endpoints for each component.

#### Implementation Pattern

Located in `src/devices/custom/PowerStripAccessory.ts`, this example shows:

1. **Parts Definition**: Using the `parts` array to create independent Matter endpoints
2. **Handler Context**: Using the `context` parameter to identify which part triggered the handler
3. **Individual Control**: Each part has its own handlers that receive the `partId` in context
4. **Master Control**: Main accessory handlers can control all parts simultaneously
5. **State Updates**: Updating state for specific parts using the optional `partId` parameter

#### Basic Structure with Parts

<details>
<summary>Click to expand full example code</summary>

```typescript
import type { API, Logger } from 'homebridge'
import { BaseMatterAccessory } from '../BaseMatterAccessory.js'

export class PowerStripAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    super(api, log, {
      uuid: api.matter.uuid.generate('POWER-STRIP-001'),
      displayName: 'Power Strip',
      deviceType: api.matter.deviceTypes.OnOffOutlet,
      serialNumber: 'POWER-STRIP-001',
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-POWER-STRIP-4X',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      // Main accessory provides master control
      clusters: {
        onOff: { onOff: false },
      },
      handlers: {
        onOff: {
          on: async () => this.handleMasterOn(),
          off: async () => this.handleMasterOff(),
        },
      },

      // Define 4 independent outlet parts
      // Each appears as a separate device in Home app
      parts: [
        {
          id: 'outlet-1',
          displayName: 'Outlet 1',
          deviceType: api.matter.deviceTypes.OnOffOutlet,
          clusters: {
            onOff: { onOff: false },
          },
          handlers: {
            onOff: {
              on: async (_args, context) => this.handleOutletOn(context?.partId || 'outlet-1'),
              off: async (_args, context) => this.handleOutletOff(context?.partId || 'outlet-1'),
            },
          },
        },
        // Outlets 2-4 follow the same pattern...
      ],
    })
  }
}
```

</details>

#### Handler Context for Parts

When a handler is called from a part, it receives context information identifying which part triggered it:

```typescript
// Part handler receives context with partId
private async handleOutletOn(partId: string): Promise<void> {
  const outletNumber = this.getOutletNumber(partId) // Extract number from 'outlet-1'
  this.logInfo(`Outlet ${outletNumber} turned ON`)

  // Send command to actual hardware
  // await myPowerStripAPI.turnOnOutlet(outletNumber)
}
```

#### Controlling Individual Outlets

The power strip provides methods to control each outlet independently:

```typescript
// In your plugin code
const powerStrip = new PowerStripAccessory(this.api, this.log)

// Turn on outlet 2
await powerStrip.turnOnOutlet(2)

// Turn off outlet 4
await powerStrip.turnOffOutlet(4)

// Toggle outlet 1
await powerStrip.toggleOutlet(1)
```

**Method Signature:**
```typescript
public async turnOnOutlet(outletNumber: 1 | 2 | 3 | 4): Promise<void>
public async turnOffOutlet(outletNumber: 1 | 2 | 3 | 4): Promise<void>
public async toggleOutlet(outletNumber: 1 | 2 | 3 | 4): Promise<void>
```

#### Getting Outlet State

You can query the current state of any outlet using the Matter API with the `partId` parameter:

```typescript
// Get state of a specific outlet
const isOutlet2On = powerStrip.getOutletState(2)
console.log(`Outlet 2 is ${isOutlet2On ? 'ON' : 'OFF'}`)

// Get all outlet states
const allStates = powerStrip.getAllOutletStates()
console.log('All outlet states:', allStates)
// Output: { outlet1: true, outlet2: false, outlet3: true, outlet4: false }
```

**Method Signatures:**
```typescript
public getOutletState(outletNumber: 1 | 2 | 3 | 4): boolean
public getAllOutletStates(): Record<string, boolean>
```

<details>
<summary>Implementation Detail</summary>

```typescript
public getOutletState(outletNumber: 1 | 2 | 3 | 4): boolean {
  const partId = `outlet-${outletNumber}`

  // Get state for specific part using partId parameter
  const state = this.api.matter.getAccessoryState(
    this.uuid,
    this.api.matter.clusterNames.OnOff,
    partId
  )

  return state?.onOff === true
}
```

</details>

#### Updating State from External Sources

When outlet states change externally (via physical buttons, API, or another controller), use these methods to sync the state:

```typescript
// Update a single outlet state
powerStrip.updateOutletStateFromExternal(3, true)  // Outlet 3 turned on externally

// Update all outlet states at once
powerStrip.updateAllOutletStatesFromExternal({
  outlet1: true,
  outlet2: false,
  outlet3: true,
  outlet4: false,
})
```

**Method Signatures:**
```typescript
public updateOutletStateFromExternal(outletNumber: 1 | 2 | 3 | 4, isOn: boolean): void
public updateAllOutletStatesFromExternal(states: {
  outlet1: boolean
  outlet2: boolean
  outlet3: boolean
  outlet4: boolean
}): void
```

<details>
<summary>Implementation Detail</summary>

```typescript
public updateOutletStateFromExternal(outletNumber: 1 | 2 | 3 | 4, isOn: boolean): void {
  const partId = `outlet-${outletNumber}`

  // Update specific part state using partId parameter
  this.updateState(this.api.matter.clusterNames.OnOff, { onOff: isOn }, partId)
}
```

</details>

#### Complete Usage Example

<details>
<summary>Click to expand full integration example</summary>

```typescript
import { PowerStripAccessory } from './devices/custom/PowerStripAccessory'

class MyPowerStripPlugin {
  private powerStrip: PowerStripAccessory

  async initialize() {
    // Create the power strip accessory
    this.powerStrip = new PowerStripAccessory(this.api, this.log)

    // Register it with Homebridge
    this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
      this.powerStrip.toAccessory()
    ])

    // Set up polling to monitor external state changes
    this.startMonitoring()
  }

  // Monitor external API for state changes
  private startMonitoring() {
    setInterval(async () => {
      try {
        // Fetch current state from your device's API
        const deviceState = await myPowerStripAPI.getOutletStates()

        // Update each outlet based on external state
        for (let i = 1; i <= 4; i++) {
          const outletNumber = i as 1 | 2 | 3 | 4
          const currentState = this.powerStrip.getOutletState(outletNumber)
          const externalState = deviceState[`outlet${i}`]

          // Only update if state changed
          if (currentState !== externalState) {
            this.powerStrip.updateOutletStateFromExternal(outletNumber, externalState)
          }
        }
      } catch (error) {
        this.log.error('Failed to fetch outlet states:', error)
      }
    }, 5000) // Poll every 5 seconds
  }

  // Example: Control outlet from your plugin logic
  async handleWebhook(outlet: number, state: boolean) {
    try {
      // Control the physical device
      await myPowerStripAPI.setOutlet(outlet, state)

      // Update the Matter accessory state
      if (state) {
        await this.powerStrip.turnOnOutlet(outlet as 1 | 2 | 3 | 4)
      } else {
        await this.powerStrip.turnOffOutlet(outlet as 1 | 2 | 3 | 4)
      }
    } catch (error) {
      this.log.error(`Failed to control outlet ${outlet}:`, error)
      throw error
    }
  }
}
```

</details>

#### State Persistence

The power strip automatically persists outlet states using the `context` object:

- States are saved automatically when outlets are controlled
- States are restored when Homebridge restarts
- The `context` object is accessible for custom data storage

```typescript
// Context is automatically saved with outlet states
context: {
  outlets: {
    outlet1: { isOn: true },
    outlet2: { isOn: false },
    outlet3: { isOn: true },
    outlet4: { isOn: false },
  },
  // You can add custom data here too
  customData: 'your data'
}
```

#### Master Control Behavior

The power strip's main accessory provides a master on/off control to control all outlets simultaneously:

- **Master ON**: Turns all 4 outlet parts ON
- **Master OFF**: Turns all 4 outlet parts OFF

<details>
<summary>Implementation example</summary>

```typescript
private async handleMasterOn(): Promise<void> {
  this.logInfo('Master ON - turning on all outlets.')

  // Update each outlet's state
  for (let i = 1; i <= 4; i++) {
    const partId = `outlet-${i}`
    this.updateState(this.api.matter.clusterNames.OnOff, { onOff: true }, partId)
  }

  // Control your physical device
  // await myPowerStripAPI.turnOnAllOutlets()
}
```

</details>

#### Limitations and Considerations

**Separate Tiles in Home App (Matter vs HAP):**

This is a fundamental architectural difference between Matter and HomeKit (HAP):

- **HAP/HomeKit Accessories**: Multiple services can appear as a **single tile** with the "Show as Separate Tiles" toggle option
- **Matter Accessories with Parts**: Each part **ALWAYS appears as a separate tile** - there is no option to combine them into a single tile

This is how Matter is designed at the protocol level. Real physical Matter power strips (Tapo P304M, j5create JSPAC4430) also display each outlet as a separate tile in the Home app.

**Current Implementation Features:**
- Uses the `parts` array to create true multi-endpoint composed devices
- Each part is an independent Matter endpoint with its own handlers
- Handler context provides `partId` to identify which part triggered the handler
- State updates support optional `partId` parameter for part-specific updates
- All parts inherit manufacturer and model information from parent accessory
- Parts information is cached and persists across Homebridge restarts

**When to Use Parts:**
- Device has multiple independently controllable components (outlets, lights, zones, etc.)
- Each component needs to appear as a separate device in Home app
- Components share common metadata (manufacturer, model) but have independent state
- Examples: power strips, multi-zone speakers, combined devices (shade + light)

**Alternative Approaches:**
If you prefer a single tile with internal state management instead of separate endpoints, you can:
1. Use a single `MatterAccessory` without `parts`
2. Manage component states internally in your class
3. Provide custom methods for component control
4. Note: This won't provide separate Matter endpoints, just logical organization within your code

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

---

### Contact Sensor

| Property                 | Value                                                                                                                                         |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.ContactSensor`                                                                                                        |
| **Description**          | A contact sensor that detects open/closed state (e.g., door sensor, window sensor).                                                           |
| **Matter Specification** | § 7.1                                                                                                                                         |

#### Required Clusters

###### `BooleanState` Cluster

Represents the contact sensor state using a boolean value.

**IMPORTANT - Inverted Semantics**: The BooleanState cluster for contact sensors uses **inverted logic**:
- `true` = Contact **closed** / Normal state (door/window is closed)
- `false` = Contact **open** / Triggered state (door/window is open)

This is opposite from intuitive expectation, so you must invert values when updating state.

**Attributes**:

| Attribute    | Type    | Range/Values    | Description                                              |
|--------------|---------|-----------------|----------------------------------------------------------|
| `stateValue` | boolean | `true`, `false` | Contact state (true=closed/normal, false=open/triggered) |

**Reading State**:

```typescript
const stateValue = accessory.clusters.booleanState.stateValue
// true = closed/normal, false = open/triggered
const isOpen = !stateValue // Invert to get intuitive open/closed
```

**Updating State** (Flow B):

```typescript
// When your physical sensor reports state change
function updateContactState(isOpen: boolean) {
  // IMPORTANT: Invert the value!
  // Matter BooleanState: false = open/triggered, true = closed/normal
  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.BooleanState,
    { stateValue: !isOpen } // Invert!
  )

  log.info(`Contact state: ${isOpen ? 'OPEN' : 'CLOSED'}`)
}

// Example: Door opened
updateContactState(true) // Sends stateValue: false to Matter

// Example: Door closed
updateContactState(false) // Sends stateValue: true to Matter
```

**Initial State**:

```typescript
clusters: {
  booleanState: {
    stateValue: true,  // true = closed/normal (safe default)
  },
}
```

**Handler**: Contact sensors are read-only (no handlers needed).

---

### Occupancy Sensor

| Property                 | Value                                                                                                                                         |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.MotionSensor` (with OccupancySensing cluster)                                                                         |
| **Description**          | A sensor that detects occupancy/motion using PIR, ultrasonic, or physical contact methods.                                                    |
| **Matter Specification** | § 7.3                                                                                                                                         |

**Note**: Matter.js API calls this device type "MotionSensor" but it's actually an **Occupancy Sensor** - this is how it appears in Apple Home and other Matter controllers.

#### Required Clusters

###### `OccupancySensing` Cluster

Detects occupancy using various sensing methods.

**Attributes**:

| Attribute                   | Type    | Range/Values    | Description                                     |
|-----------------------------|---------|-----------------|-------------------------------------------------|
| `occupancy.occupied`        | boolean | `true`, `false` | Occupancy detected (true=occupied, false=clear) |
| `occupancySensorType`       | number  | 0-2             | Sensor type (0=PIR, 1=Ultrasonic, 2=Physical)   |
| `occupancySensorTypeBitmap` | object  | See below       | Bitmap of supported sensor types                |

**Occupancy Sensor Type Bitmap**:

```typescript
{
  pir: true,              // Passive infrared
  ultrasonic: false,      // Ultrasonic
  physicalContact: false, // Physical contact
}
```

**Reading State**:

```typescript
const isOccupied = accessory.clusters.occupancySensing.occupancy.occupied
```

**Updating State** (Flow B):

```typescript
// When your physical sensor detects motion/occupancy
mqttClient.on('message', (topic, message) => {
  const detected = message.toString() === 'motion'

  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.OccupancySensing,
    { occupancy: { occupied: detected } }
  )

  log.info(`Occupancy: ${detected ? 'detected' : 'clear'}`)
})
```

**Initial State with PIR Sensor**:

```typescript
// Configure OccupancySensor with PIR feature
const OccupancySensingServer = api.matter.deviceTypes.MotionSensor.requirements.OccupancySensingServer
const OccupancySensorWithPIR = api.matter.deviceTypes.MotionSensor.with(
  OccupancySensingServer.with('PassiveInfrared'),
)

{
  deviceType: OccupancySensorWithPIR,
  clusters: {
    occupancySensing: {
      occupancy: {
        occupied: false,  // No occupancy detected initially
      },
      occupancySensorType: 0,  // PIR
      occupancySensorTypeBitmap: {
        pir: true,
        ultrasonic: false,
        physicalContact: false,
      },
    },
  },
}
```

**Handler**: Occupancy sensors are read-only (no handlers needed).

---

### Window Covering

| Property                 | Value                                                                                                                                         |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.WindowCovering`                                                                                                       |
| **Description**          | A motorized window covering with lift position control (e.g., blinds, shades, curtains).                                                      |
| **Matter Specification** | § 8.3                                                                                                                                         |

#### Required Clusters

###### `WindowCovering` Cluster

Controls lift position (and optionally tilt) of window coverings.

**IMPORTANT - Inverted Position Semantics**: The WindowCovering cluster uses **inverted percentage** values:
- `0` = Fully **open** (100% open)
- `10000` = Fully **closed** (0% open)

This is opposite from intuitive expectation. You must convert between "open percentage" and Matter's "closed percentage" in both directions.

**Attributes**:

| Attribute                           | Type   | Range/Values | Description                                                      |
|-------------------------------------|--------|--------------|------------------------------------------------------------------|
| `currentPositionLiftPercent100ths`  | number | 0-10000      | Current lift position (0=open, 10000=closed, in hundredths)      |
| `targetPositionLiftPercent100ths`   | number | 0-10000      | Target lift position (0=open, 10000=closed, in hundredths)       |
| `currentPositionTiltPercent100ths`  | number | 0-10000      | Current tilt angle (0=horizontal/open, 10000=vertical/closed) ¹  |
| `targetPositionTiltPercent100ths`   | number | 0-10000      | Target tilt angle (0=horizontal/open, 10000=vertical/closed) ¹   |

¹ Tilt attributes only present on Venetian blinds with tilt control

**Reading State**:

```typescript
// Read lift position (convert to open percentage)
const closedPercent100ths = accessory.clusters.windowCovering.currentPositionLiftPercent100ths
const closedPercent = closedPercent100ths / 100
const openPercent = 100 - closedPercent // Invert!

log.info(`Blind is ${openPercent}% open`)

// Read tilt position (convert to degrees for Venetian blinds)
const tiltPercent100ths = accessory.clusters.windowCovering.currentPositionTiltPercent100ths
const degrees = Math.round((tiltPercent100ths / 10000) * 90)
log.info(`Tilt angle: ${degrees}°`) // 0° = horizontal, 90° = vertical
```

**Value Conversions**:

```typescript
// Open percentage (0-100) to Matter value (0-10000)
function openPercentToMatter(openPercent: number): number {
  const closedPercent = 100 - openPercent // Invert!
  return Math.round(closedPercent * 100)
}

// Matter value (0-10000) to open percentage (0-100)
function matterToOpenPercent(value: number): number {
  const closedPercent = value / 100
  return 100 - closedPercent // Invert!
}

// Tilt degrees (0-90) to Matter value (0-10000)
function degreesToMatter(degrees: number): number {
  return Math.round((degrees / 90) * 10000)
}

// Matter value (0-10000) to tilt degrees (0-90)
function matterToDegrees(value: number): number {
  return Math.round((value / 10000) * 90)
}
```

<details>
<summary><strong>Handlers</strong></summary>

```typescript
import type { MatterRequests } from 'homebridge'

handlers: {
  windowCovering: {
    /**
     * Called when user adjusts lift position via Home app
     */
    goToLiftPercentage: async (request: MatterRequests.GoToLiftPercentage) => {
      const { liftPercent100thsValue } = request

      // Matter uses 0=open, 10000=closed, so invert to get open percentage
      const closedPercent = liftPercent100thsValue / 100
      const openPercent = 100 - closedPercent  // Invert!

      log.info(`Moving to ${openPercent}% open`)
      await myBlindAPI.setPosition(openPercent)
      // State automatically updated by Homebridge
    },

    /**
     * Called when user presses UP button in Home app
     */
    upOrOpen: async () => {
      log.info('Opening blind')
      await myBlindAPI.open()
      // Update state after physical device confirms
      api.matter.updateAccessoryState(
        uuid,
        api.matter.clusterNames.WindowCovering,
        {
          currentPositionLiftPercent100ths: 0,  // 0 = fully open
          targetPositionLiftPercent100ths: 0,
        }
      )
    },

    /**
     * Called when user presses DOWN button in Home app
     */
    downOrClose: async () => {
      log.info('Closing blind')
      await myBlindAPI.close()
      // Update state after physical device confirms
      api.matter.updateAccessoryState(
        uuid,
        api.matter.clusterNames.WindowCovering,
        {
          currentPositionLiftPercent100ths: 10000,  // 10000 = fully closed
          targetPositionLiftPercent100ths: 10000,
        }
      )
    },

    /**
     * Called when user presses STOP button in Home app
     */
    stopMotion: async () => {
      log.info('Stopping blind movement')
      await myBlindAPI.stop()
    },
  },
}
```

</details>

**Updating State** (Flow B):

```typescript
// When your physical blind moves to a new position
function updateBlindPosition(openPercent: number) {
  // Convert open percentage to Matter's closed percentage (0=open, 10000=closed)
  const closedPercent = 100 - openPercent // Invert!
  const value = Math.round(closedPercent * 100)

  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.WindowCovering,
    {
      currentPositionLiftPercent100ths: value,
      targetPositionLiftPercent100ths: value,
    }
  )

  log.info(`Lift position: ${openPercent}% open`)
}

// Example: Blind is 40% open
updateBlindPosition(40) // Sends value: 6000 to Matter (60% closed)
```

**For Venetian Blinds with Tilt**:

Add tilt control handler and update method:

```typescript
// Handler for tilt control
handlers: {
  windowCovering: {
    // ... lift handlers above ...

    /**
     * Called when user adjusts tilt angle via Home app
     * Tilt is shown as 0-90° in Home app (0=horizontal, 90=vertical)
     */
    goToTiltPercentage: async (request: MatterRequests.GoToTiltPercentage) => {
      const { tiltPercent100thsValue } = request

      // Matter tilt: 0=horizontal/open (0°), 10000=vertical/closed (90°)
      const degrees = Math.round((tiltPercent100thsValue / 10000) * 90)

      log.info(`Tilting to ${degrees}°`)
      await myBlindAPI.setTiltAngle(degrees)
      // State automatically updated by Homebridge
    },
  },
}

// Update tilt position (Flow B)
function updateTiltPosition(degrees: number) {
  // Convert degrees (0-90) to Matter's tilt percentage (0=horizontal, 10000=vertical)
  const value = Math.round((degrees / 90) * 10000)

  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.WindowCovering,
    {
      currentPositionTiltPercent100ths: value,
      targetPositionTiltPercent100ths: value,
    }
  )

  log.info(`Tilt position: ${degrees}°`)
}
```

---

### Thermostat

| Property                 | Value                                                                                                                                         |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.Thermostat`                                                                                                           |
| **Description**          | A thermostat with heating and/or cooling control, temperature setpoints, and system mode management.                                          |
| **Matter Specification** | § 9.1                                                                                                                                         |

#### Required Clusters

###### `Thermostat` Cluster

Controls HVAC system mode, setpoints, and reports current temperature.

**Attributes**:

| Attribute                    | Type   | Range/Values | Description                                               |
|------------------------------|--------|--------------|-----------------------------------------------------------|
| `localTemperature`           | number | -27315-32767 | Current temperature (hundredths of °C) ¹                  |
| `occupiedHeatingSetpoint`    | number | 700-3000     | Target heating temperature (hundredths of °C)             |
| `occupiedCoolingSetpoint`    | number | 1600-3200    | Target cooling temperature (hundredths of °C)             |
| `systemMode`                 | number | 0-7          | Current system mode (0=Off, 1=Auto, 3=Cool, 4=Heat, etc.) |
| `controlSequenceOfOperation` | number | 0-5          | Supported modes (2=Heating only, 4=Cooling and Heating)   |
| `minHeatSetpointLimit`       | number | 700-3000     | Minimum heating setpoint                                  |
| `maxHeatSetpointLimit`       | number | 700-3000     | Maximum heating setpoint                                  |
| `minCoolSetpointLimit`       | number | 1600-3200    | Minimum cooling setpoint                                  |
| `maxCoolSetpointLimit`       | number | 1600-3200    | Maximum cooling setpoint                                  |

¹ Temperature values are in **hundredths of degrees Celsius**: `2500` = `25.00°C`

**System Mode Values**:

| Value | Mode              | Description                                    |
|-------|-------------------|------------------------------------------------|
| 0     | Off               | System is off                                  |
| 1     | Auto              | Automatic heating/cooling based on temperature |
| 2     | Reserved          | Reserved (not used)                            |
| 3     | Cool              | Cooling mode                                   |
| 4     | Heat              | Heating mode                                   |
| 5     | Emergency Heating | Emergency heat mode                            |
| 6     | Precooling        | Precooling mode                                |
| 7     | Fan Only          | Fan only (no heating/cooling)                  |

**Control Sequence of Operation Values**:

| Value | Description                     |
|-------|---------------------------------|
| 0     | Cooling only                    |
| 1     | Cooling with reheat             |
| 2     | Heating only                    |
| 3     | Heating with reheat             |
| 4     | Cooling and heating             |
| 5     | Cooling and heating with reheat |

**Reading State**:

```typescript
// Read current temperature
const tempHundredths = accessory.clusters.thermostat.localTemperature
const celsius = tempHundredths / 100
log.info(`Current temperature: ${celsius}°C`)

// Read heating setpoint
const heatSetpoint = accessory.clusters.thermostat.occupiedHeatingSetpoint / 100
log.info(`Heating setpoint: ${heatSetpoint}°C`)

// Read cooling setpoint (if supported)
const coolSetpoint = accessory.clusters.thermostat.occupiedCoolingSetpoint / 100
log.info(`Cooling setpoint: ${coolSetpoint}°C`)

// Read system mode
const mode = accessory.clusters.thermostat.systemMode
const modeNames = ['Off', 'Auto', 'Reserved', 'Cool', 'Heat', 'Emergency Heating', 'Precooling', 'Fan Only']
log.info(`System mode: ${modeNames[mode]}`)
```

**Initial State** (Heating and Cooling):

```typescript
clusters: {
  thermostat: {
    localTemperature: 2100,              // 21.00°C
    occupiedHeatingSetpoint: 2000,       // 20.00°C
    occupiedCoolingSetpoint: 2400,       // 24.00°C
    minHeatSetpointLimit: 700,           // 7.00°C
    maxHeatSetpointLimit: 3000,          // 30.00°C
    minCoolSetpointLimit: 1600,          // 16.00°C
    maxCoolSetpointLimit: 3200,          // 32.00°C
    controlSequenceOfOperation: 4,       // Cooling and Heating
    systemMode: 0,                       // Off
  },
}
```

<details>
<summary><strong>Handlers</strong></summary>

```typescript
import type { MatterRequests } from 'homebridge'

handlers: {
  thermostat: {
    /**
     * Called when user changes system mode in Home app
     */
    systemModeChange: async (request: { systemMode: number, oldSystemMode: number }) => {
      const { systemMode, oldSystemMode } = request

      // Matter Thermostat SystemMode enum: 0=Off, 1=Auto, 3=Cool, 4=Heat, 5=EmergencyHeat, 6=Precooling, 7=FanOnly
      const modeNames = ['Off', 'Auto', 'Reserved', 'Cool', 'Heat', 'Emergency Heating', 'Precooling', 'Fan Only']
      const modeName = modeNames[systemMode] || `Unknown (${systemMode})`

      log.info(`System mode changed to: ${modeName}`)
      await myThermostatAPI.setSystemMode(systemMode)
      // State automatically updated by Homebridge
    },

    /**
     * Called when user adjusts heating setpoint in Home app
     */
    heatingSetpointChange: async (request: { heatingSetpoint: number, oldHeatingSetpoint: number }) => {
      const celsius = request.heatingSetpoint / 100

      log.info(`Heating setpoint changed to: ${celsius}°C`)
      await myThermostatAPI.setHeatingSetpoint(celsius)
      // State automatically updated by Homebridge
    },

    /**
     * Called when user adjusts cooling setpoint in Home app
     */
    coolingSetpointChange: async (request: { coolingSetpoint: number, oldCoolingSetpoint: number }) => {
      const celsius = request.coolingSetpoint / 100

      log.info(`Cooling setpoint changed to: ${celsius}°C`)
      await myThermostatAPI.setCoolingSetpoint(celsius)
      // State automatically updated by Homebridge
    },
  },
}
```

</details>

**Updating State** (Flow B):

```typescript
// Update current temperature
function updateTemperature(celsius: number) {
  const value = Math.round(celsius * 100)

  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.Thermostat,
    { localTemperature: value }
  )

  log.info(`Temperature: ${celsius}°C`)
}

// Update heating setpoint
function updateHeatingSetpoint(celsius: number) {
  const value = Math.round(celsius * 100)

  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.Thermostat,
    { occupiedHeatingSetpoint: value }
  )

  log.info(`Heating setpoint: ${celsius}°C`)
}

// Update cooling setpoint
function updateCoolingSetpoint(celsius: number) {
  const value = Math.round(celsius * 100)

  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.Thermostat,
    { occupiedCoolingSetpoint: value }
  )

  log.info(`Cooling setpoint: ${celsius}°C`)
}

// Update system mode
function updateSystemMode(mode: number) {
  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.Thermostat,
    { systemMode: mode }
  )

  const modeNames = ['Off', 'Auto', 'Reserved', 'Cool', 'Heat', 'Emergency Heating', 'Precooling', 'Fan Only']
  log.info(`System mode: ${modeNames[mode]}`)
}
```

---

### Fan

| Property                 | Value                                                                                                                                         |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.Fan`                                                                                                                  |
| **Description**          | A fan with variable speed control and multiple fan modes.                                                                                     |
| **Matter Specification** | § 9.2                                                                                                                                         |

#### Required Clusters

###### `FanControl` Cluster

Controls fan mode and speed.

**Attributes**:

| Attribute          | Type   | Range/Values | Description                                                   |
|--------------------|--------|--------------|---------------------------------------------------------------|
| `fanMode`          | number | 0-6          | Current fan mode (0=Off, 1=Low, 2=Medium, 3=High, 4=On, etc.) |
| `fanModeSequence`  | number | 0-4          | Supported fan mode sequence                                   |
| `percentSetting`   | number | 0-100        | Target fan speed percentage (0=off, 1-100=on with speed)      |
| `percentCurrent`   | number | 0-100        | Current fan speed percentage                                  |

**Fan Mode Values**:

| Value | Mode   | Description        |
|-------|--------|--------------------|
| 0     | Off    | Fan is off         |
| 1     | Low    | Low speed          |
| 2     | Medium | Medium speed       |
| 3     | High   | High speed         |
| 4     | On     | On (no speed info) |
| 5     | Auto   | Automatic mode     |
| 6     | Smart  | Smart mode         |

**Fan Mode Sequence Values**:

| Value | Description           | Available Modes           |
|-------|-----------------------|---------------------------|
| 0     | Off/Low/Med/High      | Off, Low, Med, High       |
| 1     | Off/Low/High          | Off, Low, High            |
| 2     | Off/Low/Med/High/Auto | Off, Low, Med, High, Auto |
| 3     | Off/Low/High/Auto     | Off, Low, High, Auto      |
| 4     | Off/On/Auto           | Off, On, Auto             |

**Reading State**:

```typescript
const mode = accessory.clusters.fanControl.fanMode
const speed = accessory.clusters.fanControl.percentSetting

const modeNames = ['Off', 'Low', 'Medium', 'High', 'On', 'Auto', 'Smart']
log.info(`Fan mode: ${modeNames[mode]}, Speed: ${speed}%`)
```

**Detecting On/Off vs Speed Changes**:

The `percentSetting` attribute is used for both on/off control and speed adjustment. To distinguish between the two:

```typescript
// In percentSettingChange handler
fanControl: {
  percentSettingChange: async (request: { percentSetting: number | null, oldPercentSetting: number | null }) => {
    const percent = request.percentSetting ?? 0
    const isOff = percent === 0
    const wasOff = (request.oldPercentSetting ?? 0) === 0

    // Check if on/off state changed
    if (isOff !== wasOff) {
      log.info(`Fan turned ${isOff ? 'off' : 'on'}`)
      await myFanAPI.setPower(!isOff)
    }

    // Update speed (only if not turning off)
    if (!isOff) {
      log.info(`Fan speed changed to: ${percent}%`)
      await myFanAPI.setSpeed(percent)
    }
  },
}
```

<details>
<summary><strong>Handlers</strong></summary>

```typescript
import type { MatterRequests } from 'homebridge'

handlers: {
  fanControl: {
    /**
     * Called when user uses step control (increase/decrease button)
     */
    step: async (request: MatterRequests.FanStep) => {
      const { direction, wrap, lowestOff } = request
      const dirStr = direction === 0 ? 'increase' : 'decrease'

      log.info(`Fan step ${dirStr} (wrap: ${wrap}, lowestOff: ${lowestOff})`)
      await myFanAPI.step(direction, wrap, lowestOff)
      // State automatically updated by Homebridge
    },

    /**
     * Called when user changes fan mode via Home app
     */
    fanModeChange: async (request: { fanMode: number, oldFanMode: number }) => {
      const modeNames = ['Off', 'Low', 'Medium', 'High', 'On', 'Auto', 'Smart']
      const modeName = modeNames[request.fanMode] || `Unknown (${request.fanMode})`

      log.info(`Fan mode changed to: ${modeName}`)
      await myFanAPI.setMode(request.fanMode)
      // State automatically updated by Homebridge
    },

    /**
     * Called when user adjusts fan speed via Home app
     * Also handles on/off transitions
     */
    percentSettingChange: async (request: { percentSetting: number | null, oldPercentSetting: number | null }) => {
      const percent = request.percentSetting ?? 0
      const isOff = percent === 0
      const wasOff = (request.oldPercentSetting ?? 0) === 0

      // Detect on/off state change
      if (isOff !== wasOff) {
        log.info(`Fan turned ${isOff ? 'off' : 'on'}`)
        await myFanAPI.setPower(!isOff)
      }

      // Update speed (only when not off)
      if (!isOff) {
        log.info(`Fan speed changed to: ${percent}%`)
        await myFanAPI.setSpeed(percent)
      }
      // State automatically updated by Homebridge
    },
  },
}
```

</details>

**Updating State** (Flow B):

```typescript
// Update fan mode
function updateFanMode(mode: number) {
  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.FanControl,
    { fanMode: mode }
  )

  const modeNames = ['Off', 'Low', 'Medium', 'High', 'On', 'Auto', 'Smart']
  log.info(`Fan mode: ${modeNames[mode]}`)
}

// Update fan speed
function updateFanSpeed(percent: number) {
  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.FanControl,
    {
      percentSetting: percent,
      percentCurrent: percent,
    }
  )

  log.info(`Fan speed: ${percent}%`)
}
```

---

### Light Sensor

| Property                 | Value                                                                                                                                         |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.LightSensor`                                                                                                          |
| **Description**          | A sensor that measures ambient light levels.                                                                                                  |
| **Matter Specification** | § 7.2                                                                                                                                         |

#### Required Clusters

###### `IlluminanceMeasurement` Cluster

Measures illuminance (light level) in lux.

**Attributes**:

| Attribute          | Type   | Range/Values | Description                               |
|--------------------|--------|--------------|-------------------------------------------|
| `measuredValue`    | number | 0-65534      | Current light level (logarithmic scale) ¹ |
| `minMeasuredValue` | number | 1-65533      | Minimum measurable light level            |
| `maxMeasuredValue` | number | 2-65534      | Maximum measurable light level            |

¹ The `measuredValue` uses a logarithmic scale: `value = 10000 × log₁₀(lux)`

**Value Conversion**:

```typescript
// Lux to Matter value
const matterValue = Math.round(10000 * Math.log10(lux))

// Matter value to Lux
const lux = 10 ** (matterValue / 10000)
```

**Reading State**:

```typescript
const matterValue = accessory.clusters.illuminanceMeasurement.measuredValue
const lux = 10 ** (matterValue / 10000)
log.info(`Light level: ${lux.toFixed(1)} lux`)
```

**Updating State** (Flow B):

```typescript
// When your physical sensor reports new light level
function updateIlluminance(lux: number) {
  const value = Math.round(10000 * Math.log10(lux))

  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.IlluminanceMeasurement,
    { measuredValue: value }
  )

  log.info(`Illuminance: ${lux} lux`)
}

// Example: 500 lux
updateIlluminance(500) // Sends value: ~27000
```

**Initial State**:

```typescript
clusters: {
  illuminanceMeasurement: {
    measuredValue: 5000,   // ~3.16 lux
    minMeasuredValue: 1,   // Minimum
    maxMeasuredValue: 65534, // Maximum
  },
}
```

**Handler**: Light sensors are read-only (no handlers needed).

---

### Temperature Sensor

| Property                 | Value                                                                                                                                         |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.TemperatureSensor`                                                                                                    |
| **Description**          | A sensor that measures ambient temperature.                                                                                                   |
| **Matter Specification** | § 7.4                                                                                                                                         |

#### Required Clusters

###### `TemperatureMeasurement` Cluster

Measures temperature in degrees Celsius.

**Attributes**:

| Attribute          | Type   | Range/Values | Description                              |
|--------------------|--------|--------------|------------------------------------------|
| `measuredValue`    | number | -27315-32767 | Current temperature (hundredths of °C) ¹ |
| `minMeasuredValue` | number | -27315-32767 | Minimum measurable temperature           |
| `maxMeasuredValue` | number | -27315-32767 | Maximum measurable temperature           |

¹ Temperature values are in **hundredths of degrees Celsius**: `2100` = `21.00°C`

**Reading State**:

```typescript
const tempHundredths = accessory.clusters.temperatureMeasurement.measuredValue
const celsius = tempHundredths / 100
log.info(`Temperature: ${celsius}°C`)
```

**Updating State** (Flow B):

```typescript
// When your physical sensor reports new temperature
function updateTemperature(celsius: number) {
  const value = Math.round(celsius * 100)

  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.TemperatureMeasurement,
    { measuredValue: value }
  )

  log.info(`Temperature: ${celsius}°C`)
}

// Example: 21.5°C
updateTemperature(21.5) // Sends value: 2150
```

**Initial State**:

```typescript
clusters: {
  temperatureMeasurement: {
    measuredValue: 2100,     // 21.00°C
    minMeasuredValue: -5000, // -50.00°C
    maxMeasuredValue: 10000, // 100.00°C
  },
}
```

**Handler**: Temperature sensors are read-only (no handlers needed).

---

### Humidity Sensor

| Property                 | Value                                                                                                                                         |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.HumiditySensor`                                                                                                       |
| **Description**          | A sensor that measures relative humidity.                                                                                                     |
| **Matter Specification** | § 7.7                                                                                                                                         |

#### Required Clusters

###### `RelativeHumidityMeasurement` Cluster

Measures relative humidity as a percentage.

**Attributes**:

| Attribute          | Type   | Range/Values | Description                                  |
|--------------------|--------|--------------|----------------------------------------------|
| `measuredValue`    | number | 0-10000      | Current humidity (hundredths of a percent) ¹ |
| `minMeasuredValue` | number | 0-9999       | Minimum measurable humidity                  |
| `maxMeasuredValue` | number | 1-10000      | Maximum measurable humidity                  |

¹ Humidity values are in **hundredths of a percent**: `5500` = `55.00%`

**Reading State**:

```typescript
const humidityHundredths = accessory.clusters.relativeHumidityMeasurement.measuredValue
const percent = humidityHundredths / 100
log.info(`Humidity: ${percent}%`)
```

**Updating State** (Flow B):

```typescript
// When your physical sensor reports new humidity
function updateHumidity(percent: number) {
  const value = Math.round(percent * 100)

  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.RelativeHumidityMeasurement,
    { measuredValue: value }
  )

  log.info(`Humidity: ${percent}%`)
}

// Example: 65.5%
updateHumidity(65.5) // Sends value: 6550
```

**Initial State**:

```typescript
clusters: {
  relativeHumidityMeasurement: {
    measuredValue: 5500,  // 55%
    minMeasuredValue: 0,  // 0%
    maxMeasuredValue: 10000, // 100%
  },
}
```

**Handler**: Humidity sensors are read-only (no handlers needed).

---

### Smoke/CO Alarm

| Property                 | Value                                                                                                                                         |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.SmokeSensor` (with SmokeAlarm and CoAlarm features)                                                                   |
| **Description**          | A combined smoke and carbon monoxide alarm sensor.                                                                                            |
| **Matter Specification** | § 7.9                                                                                                                                         |

#### Required Clusters

###### `SmokeCoAlarm` Cluster

Detects smoke and carbon monoxide with three alarm states.

**Attributes**:

| Attribute                 | Type    | Range/Values | Description                                           |
|---------------------------|---------|--------------|-------------------------------------------------------|
| `smokeState`              | number  | 0-2          | Smoke alarm state (0=Normal, 1=Warning, 2=Critical)   |
| `coState`                 | number  | 0-2          | CO alarm state (0=Normal, 1=Warning, 2=Critical)      |
| `batteryAlert`            | number  | 0-2          | Battery level alert                                   |
| `deviceMuted`             | number  | 0-2          | Device mute status                                    |
| `testInProgress`          | boolean | true/false   | Whether self-test is running                          |
| `hardwareFaultAlert`      | boolean | true/false   | Hardware fault detected                               |
| `endOfServiceAlert`       | number  | 0-2          | End of service life alert                             |
| `interconnectSmokeAlarm`  | number  | 0-2          | Interconnected smoke alarm status                     |
| `interconnectCoAlarm`     | number  | 0-2          | Interconnected CO alarm status                        |
| `contaminationState`      | number  | 0-2          | Sensor contamination state                            |
| `smokeSensitivityLevel`   | number  | 0-2          | Smoke sensitivity level                               |
| `expressedState`          | number  | 0-10         | Overall alarm state                                   |

**Alarm State Values**:

| Value | State    | Description             |
|-------|----------|-------------------------|
| 0     | Normal   | No alarm detected       |
| 1     | Warning  | Warning level detected  |
| 2     | Critical | Critical level detected |

**Reading State**:

```typescript
const smokeState = accessory.clusters.smokeCoAlarm.smokeState
const coState = accessory.clusters.smokeCoAlarm.coState

const stateNames = ['Normal', 'Warning', 'Critical']
log.info(`Smoke: ${stateNames[smokeState]}, CO: ${stateNames[coState]}`)
```

**Updating State** (Flow B):

```typescript
// Update smoke alarm state
function updateSmokeState(state: 0 | 1 | 2) {
  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.SmokeCoAlarm,
    { smokeState: state }
  )

  const stateStr = ['Normal', 'Warning', 'Critical'][state]
  log.info(`Smoke state: ${stateStr}`)
}

// Update CO alarm state
function updateCOState(state: 0 | 1 | 2) {
  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.SmokeCoAlarm,
    { coState: state }
  )

  const stateStr = ['Normal', 'Warning', 'Critical'][state]
  log.info(`CO state: ${stateStr}`)
}

// Example: Smoke detected
updateSmokeState(2) // Critical
```

**Initial State with Both Features**:

```typescript
// Configure Smoke/CO Alarm with both features
const SmokeCoAlarmServer = api.matter.deviceTypes.SmokeSensor.requirements.SmokeCoAlarmServer
const SmokeSensorWithBoth = api.matter.deviceTypes.SmokeSensor.with(
  SmokeCoAlarmServer.with('SmokeAlarm', 'CoAlarm'),
)

{
  deviceType: SmokeSensorWithBoth,
  clusters: {
    smokeCoAlarm: {
      smokeState: 0,              // Normal
      coState: 0,                 // Normal
      batteryAlert: 0,            // Normal
      deviceMuted: 0,             // Not muted
      testInProgress: false,      // No test running
      hardwareFaultAlert: false,  // No fault
      endOfServiceAlert: 0,       // Normal
      interconnectSmokeAlarm: 0,  // Normal
      interconnectCoAlarm: 0,     // Normal
      contaminationState: 0,      // Normal
      smokeSensitivityLevel: 1,   // Standard sensitivity
      expressedState: 0,          // Normal
    },
  },
}
```

**Handler**: Smoke/CO alarms are read-only (no handlers needed).

---

### Water Leak Detector

| Property                 | Value                                                                                                                                         |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.LeakSensor`                                                                                                           |
| **Description**          | A sensor that detects water leaks.                                                                                                            |
| **Matter Specification** | § 7.12                                                                                                                                        |

#### Required Clusters

###### `BooleanState` Cluster

Represents water leak detection state using a boolean value.

**NOTE**: Unlike contact sensors, leak detectors use **standard (non-inverted) semantics**:
- `false` = No leak detected / Dry (normal state)
- `true` = Leak detected / Wet (triggered state)

**Attributes**:

| Attribute    | Type    | Range/Values    | Description                                  |
|--------------|---------|-----------------|----------------------------------------------|
| `stateValue` | boolean | `true`, `false` | Leak state (true=leak, false=dry)            |

**Reading State**:

```typescript
const leakDetected = accessory.clusters.booleanState.stateValue
log.info(`Leak: ${leakDetected ? 'DETECTED' : 'None'}`)
```

**Updating State** (Flow B):

```typescript
// When your physical sensor reports leak state
function updateLeakState(leakDetected: boolean) {
  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.BooleanState,
    { stateValue: leakDetected }
  )

  log.info(`Leak: ${leakDetected ? 'detected' : 'none'}`)
}

// Example: Leak detected
updateLeakState(true) // Sends stateValue: true

// Example: Leak cleared
updateLeakState(false) // Sends stateValue: false
```

**Initial State**:

```typescript
clusters: {
  booleanState: {
    stateValue: false,  // false = dry/normal (safe default)
  },
}
```

**Handler**: Leak sensors are read-only (no handlers needed).

---

### Door Lock

| Property                 | Value                                                                                                                                         |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.DoorLock`                                                                                                             |
| **Description**          | A smart lock that can be locked and unlocked, optionally with PIN code support.                                                               |
| **Matter Specification** | § 8.1                                                                                                                                         |

#### Required Clusters

###### `DoorLock` Cluster

Controls door lock/unlock operations.

**Attributes**:

| Attribute         | Type    | Range/Values | Description                                                 |
|-------------------|---------|--------------|-------------------------------------------------------------|
| `lockState`       | number  | 0-2          | Current lock state (0=NotFullyLocked, 1=Locked, 2=Unlocked) |
| `lockType`        | number  | 0-11         | Type of lock mechanism                                      |
| `actuatorEnabled` | boolean | true/false   | Whether lock actuator is enabled                            |
| `operatingMode`   | number  | 0-4          | Current operating mode                                      |

**Lock State Values**:

| Value | State           | Description                    |
|-------|-----------------|--------------------------------|
| 0     | NotFullyLocked  | Lock is not fully engaged      |
| 1     | Locked          | Lock is fully engaged          |
| 2     | Unlocked        | Lock is disengaged             |

**Lock Type Values** (common types):

| Value | Type       | Description          |
|-------|------------|----------------------|
| 0     | DeadBolt   | Standard deadbolt    |
| 1     | Magnetic   | Magnetic lock        |
| 2     | Other      | Other type           |

Access all lock types via `api.matter.types.DoorLock.LockType`:

```typescript
api.matter.types.DoorLock.LockType.DeadBolt
api.matter.types.DoorLock.LockType.Magnetic
api.matter.types.DoorLock.LockType.Mortise
// etc.
```

**Reading State**:

```typescript
const lockState = accessory.clusters.doorLock.lockState
const stateNames = ['NotFullyLocked', 'Locked', 'Unlocked']
log.info(`Lock state: ${stateNames[lockState]}`)
```

<details>
<summary><strong>Handlers</strong></summary>

```typescript
import type { MatterRequests } from 'homebridge'

handlers: {
  doorLock: {
    /**
     * Called when user locks the door via Home app
     */
    lockDoor: async (request?: MatterRequests.LockDoor) => {
      const pinCode = request?.pinCode  // Optional PIN code

      if (pinCode) {
        log.info(`Locking door with PIN: ${Buffer.from(pinCode).toString()}`)
      } else {
        log.info('Locking door')
      }

      await myLockAPI.lock()
      // State automatically updated by Homebridge
    },

    /**
     * Called when user unlocks the door via Home app
     */
    unlockDoor: async (request?: MatterRequests.UnlockDoor) => {
      const pinCode = request?.pinCode  // Optional PIN code

      if (pinCode) {
        log.info(`Unlocking door with PIN: ${Buffer.from(pinCode).toString()}`)
      } else {
        log.info('Unlocking door')
      }

      await myLockAPI.unlock()
      // State automatically updated by Homebridge
    },
  },
}
```

</details>

**Updating State** (Flow B):

```typescript
// Update lock state
function updateLockState(state: 0 | 1 | 2) {
  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.DoorLock,
    { lockState: state }
  )

  const stateStr = ['NotFullyLocked', 'Locked', 'Unlocked'][state]
  log.info(`Lock state: ${stateStr}`)
}

// Example: Lock engaged
updateLockState(1) // Locked

// Example: Lock disengaged
updateLockState(2) // Unlocked
```

**Initial State**:

```typescript
clusters: {
  doorLock: {
    lockState: api.matter.types.DoorLock.LockState.Unlocked,  // 2
    lockType: api.matter.types.DoorLock.LockType.DeadBolt,    // 0
    actuatorEnabled: true,
    operatingMode: api.matter.types.DoorLock.OperatingMode.Normal, // 0
  },
}
```

---

### Robotic Vacuum Cleaner

| Property                 | Value                                                                                                                                         |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Device Type**          | `api.matter.deviceTypes.RoboticVacuumCleaner`                                                                                                 |
| **Description**          | A robotic vacuum cleaner with run modes, operational states, and cleaning modes.                                                              |
| **Matter Specification** | § 12.1                                                                                                                                        |

**IMPORTANT**: Robotic vacuum cleaners **must** be published on a dedicated Matter bridge using `api.matter.publishExternalAccessories()` for Apple Home compatibility.

#### Required Clusters

###### `RvcRunMode` Cluster

Controls the vacuum's run mode (Idle, Cleaning, etc.).

**Attributes**:

| Attribute        | Type   | Description                              |
|------------------|--------|------------------------------------------|
| `supportedModes` | array  | List of supported run modes              |
| `currentMode`    | number | Current run mode                         |

**Common Run Mode Tags**:

| Tag Value | Name     | Description                    |
|-----------|----------|--------------------------------|
| 16384     | Idle     | Vacuum is idle/docked          |
| 16385     | Cleaning | Vacuum is cleaning             |
| 16386     | Mapping  | Vacuum is mapping the space    |

###### `RvcCleanMode` Cluster

Controls the vacuum's cleaning mode (Vacuum, Mop, etc.).

**Attributes**:

| Attribute        | Type   | Description                              |
|------------------|--------|------------------------------------------|
| `supportedModes` | array  | List of supported clean modes            |
| `currentMode`    | number | Current clean mode                       |

**Common Clean Mode Tags**:

| Tag Value | Name      | Description                    |
|-----------|-----------|--------------------------------|
| 16384     | DeepClean | Deep cleaning mode             |
| 16385     | Vacuum    | Vacuum only mode               |
| 16386     | Mop       | Mop only mode                  |

###### `RvcOperationalState` Cluster

Reports the vacuum's operational state and provides control commands.

**Attributes**:

| Attribute              | Type   | Description                          |
|------------------------|--------|--------------------------------------|
| `operationalStateList` | array  | List of supported operational states |
| `operationalState`     | number | Current operational state ID         |

**Common Operational State IDs**:

| State ID | State   | Description                    |
|----------|---------|--------------------------------|
| 0        | Stopped | Vacuum is stopped              |
| 1        | Running | Vacuum is actively cleaning    |
| 2        | Paused  | Vacuum is paused               |
| 3        | Error   | Vacuum encountered an error    |

**Reading State**:

```typescript
const runMode = accessory.clusters.rvcRunMode.currentMode
const cleanMode = accessory.clusters.rvcCleanMode.currentMode
const opState = accessory.clusters.rvcOperationalState.operationalState

const runModes = ['Idle', 'Cleaning']
const cleanModes = ['Vacuum', 'Mop']
const opStates = ['Stopped', 'Running', 'Paused', 'Error']

log.info(`Run: ${runModes[runMode]}, Clean: ${cleanModes[cleanMode]}, State: ${opStates[opState]}`)
```

<details>
<summary><strong>Handlers</strong></summary>

```typescript
import type { MatterRequests } from 'homebridge'

handlers: {
  rvcRunMode: {
    /**
     * Called when user changes run mode via Home app
     */
    changeToMode: async (request: MatterRequests.ChangeToMode) => {
      const { newMode } = request
      const modeStr = ['Idle', 'Cleaning'][newMode] || 'Unknown'

      log.info(`Changing run mode to: ${modeStr}`)
      await myVacuumAPI.setRunMode(newMode)
      // State automatically updated by Homebridge
    },
  },

  rvcCleanMode: {
    /**
     * Called when user changes clean mode via Home app
     */
    changeToMode: async (request: MatterRequests.ChangeToMode) => {
      const { newMode } = request
      const modeStr = ['Vacuum', 'Mop'][newMode] || 'Unknown'

      log.info(`Changing clean mode to: ${modeStr}`)
      await myVacuumAPI.setCleanMode(newMode)
      // State automatically updated by Homebridge
    },
  },

  rvcOperationalState: {
    /**
     * Called when user starts the vacuum
     */
    start: async () => {
      log.info('Starting vacuum')
      await myVacuumAPI.start()
      // Update state to Running (1)
      api.matter.updateAccessoryState(
        uuid,
        api.matter.clusterNames.RvcOperationalState,
        { operationalState: 1 }
      )
    },

    /**
     * Called when user pauses the vacuum
     */
    pause: async () => {
      log.info('Pausing vacuum')
      await myVacuumAPI.pause()
      // Update state to Paused (2)
      api.matter.updateAccessoryState(
        uuid,
        api.matter.clusterNames.RvcOperationalState,
        { operationalState: 2 }
      )
    },

    /**
     * Called when user stops the vacuum
     */
    stop: async () => {
      log.info('Stopping vacuum')
      await myVacuumAPI.stop()
      // Update state to Stopped (0)
      api.matter.updateAccessoryState(
        uuid,
        api.matter.clusterNames.RvcOperationalState,
        { operationalState: 0 }
      )
    },

    /**
     * Called when user resumes the vacuum
     */
    resume: async () => {
      log.info('Resuming vacuum')
      await myVacuumAPI.resume()
      // Update state to Running (1)
      api.matter.updateAccessoryState(
        uuid,
        api.matter.clusterNames.RvcOperationalState,
        { operationalState: 1 }
      )
    },
  },
}
```

</details>

**Updating State** (Flow B):

```typescript
// Update operational state
function updateOperationalState(state: number) {
  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.RvcOperationalState,
    { operationalState: state }
  )

  const states = ['Stopped', 'Running', 'Paused', 'Error']
  log.info(`Operational state: ${states[state]}`)
}

// Update run mode
function updateRunMode(mode: number) {
  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.RvcRunMode,
    { currentMode: mode }
  )

  const modes = ['Idle', 'Cleaning']
  log.info(`Run mode: ${modes[mode]}`)
}

// Update clean mode
function updateCleanMode(mode: number) {
  api.matter.updateAccessoryState(
    uuid,
    api.matter.clusterNames.RvcCleanMode,
    { currentMode: mode }
  )

  const modes = ['Vacuum', 'Mop']
  log.info(`Clean mode: ${modes[mode]}`)
}
```

**Initial State**:

```typescript
clusters: {
  rvcRunMode: {
    supportedModes: [
      { label: 'Idle', mode: 0, modeTags: [{ value: 16384 }] },
      { label: 'Cleaning', mode: 1, modeTags: [{ value: 16385 }] },
    ],
    currentMode: 0,  // Idle
  },
  rvcCleanMode: {
    supportedModes: [
      { label: 'Vacuum', mode: 0, modeTags: [{ value: 16385 }] },
      { label: 'Mop', mode: 1, modeTags: [{ value: 16386 }] },
    ],
    currentMode: 0,  // Vacuum
  },
  rvcOperationalState: {
    operationalStateList: [
      { operationalStateId: 0, operationalStateLabel: 'Stopped' },
      { operationalStateId: 1, operationalStateLabel: 'Running' },
      { operationalStateId: 2, operationalStateLabel: 'Paused' },
      { operationalStateId: 3, operationalStateLabel: 'Error' },
    ],
    operationalState: 0,  // Stopped
  },
}
```

**Publishing** (Required for Apple Home):

```typescript
// IMPORTANT: Robotic vacuums must be published externally
const accessories = [
  {
    uuid: api.matter.uuid.generate('robot-vacuum'),
    displayName: 'Robot Vacuum',
    deviceType: api.matter.deviceTypes.RoboticVacuumCleaner,
    // ... configuration
  }
]

// Use publishExternalAccessories instead of registerPlatformAccessories
api.matter.publishExternalAccessories(PLUGIN_NAME, accessories)

// This creates a dedicated Matter bridge with its own QR code
```
