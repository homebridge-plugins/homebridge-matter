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
8. [Device Reference](#device-reference)

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
    onOff: { onOff: false },           // OnOff cluster
    levelControl: { currentLevel: 127 }, // LevelControl cluster
  },
}
```

**Key Points**:
- **Each accessory you create = 1 endpoint**
- The `clusters` object defines which clusters (capabilities) that endpoint has
- The device type determines which clusters are required/optional for that endpoint

### HomeKit vs Matter

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
api.matter.deviceTypes.DimmableOutlet
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

### Reading Current State

There are two ways to read cluster state:

#### Method 1: Direct Property Access (Recommended)

Access cluster attributes directly from the accessory object:

```typescript
// Read power state
const isOn = accessory.clusters.onOff.onOff  // boolean

// Read brightness
const level = accessory.clusters.levelControl.currentLevel  // 1-254
const percent = Math.round((level / 254) * 100)  // Convert to percentage

// Read color
const hue = accessory.clusters.colorControl.currentHue  // 0-254
const saturation = accessory.clusters.colorControl.currentSaturation  // 0-254
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
  const isOn = state.onOff  // boolean
}

// Read brightness
const levelState = api.matter.getAccessoryState(uuid, api.matter.clusterNames.LevelControl)
if (levelState) {
  const level = levelState.currentLevel  // 1-254
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
  accessory.uuid,                      // UUID of the accessory
  api.matter.clusterNames.OnOff,       // Cluster name (use constants!)
  { onOff: true }                      // New attribute values
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

You must monitor your physical device to detect external changes (Flow B). There are two approaches:

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
}, 5000)  // Poll every 5 seconds
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

## Best Practices - WE ARE UP TO HERE!

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

### 3. Never Update in Handlers (Flow A)

Handlers automatically update Matter state. Only use `updateAccessoryState()` for external changes (Flow B).

```typescript
// ❌ WRONG
handlers: {
  onOff: {
    on: async () => {
      await myDevice.turnOn()
      api.matter.updateAccessoryState(...)  // Don't do this!
    }
  }
}

// ✅ CORRECT
handlers: {
  onOff: {
    on: async () => {
      await myDevice.turnOn()
      // State is automatically updated
    }
  }
}
```

### 4. Handle Errors Gracefully

Always wrap device communication in try-catch blocks:

```typescript
try {
  await myDevice.turnOn()
} catch (error) {
  log.error(`Failed to control device: ${error}`)
  throw error  // Let Homebridge handle the error
}
```

### 5. Reconnect on Connection Loss

For event-based monitoring, implement automatic reconnection:

```typescript
ws.on('close', () => {
  log.warn('Connection lost, reconnecting...')
  setTimeout(() => reconnect(), 5000)
})
```

### 6. Log Clearly

Distinguish between the two flows in your logs:

```typescript
log.info('[Device] Home app → Physical device: Turning ON')
log.info('[Device] Physical device → Home app: State changed to ON')
```

### 7. Use Cluster Name Constants

Always use `api.matter.clusterNames.*` constants instead of strings:

```typescript
// ✅ CORRECT
api.matter.updateAccessoryState(uuid, api.matter.clusterNames.OnOff, {...})

// ❌ WRONG
api.matter.updateAccessoryState(uuid, 'onOff', {...})
```

### 8. Store Connection Objects for Cleanup

Keep references to connections for proper cleanup when plugin stops:

```typescript
let mqttClient: mqtt.MqttClient
let wsConnection: WebSocket

// Clean up on plugin shutdown
context.api.on('shutdown', () => {
  mqttClient?.end()
  wsConnection?.close()
})
```

---

## Device Reference

This section documents all available Matter device types with their clusters, attributes, handlers, and usage examples.

### On/Off Light

**Device Type**: `api.matter.deviceTypes.OnOffLight`

**Description**: A lighting device capable of being switched on or off.

**Matter Specification**: § 4.1

#### Required Clusters

##### OnOff Cluster

Controls the power state of the light.

**Attributes**:

| Attribute | Type    | Range/Values    | Description                    |
|-----------|---------|-----------------|--------------------------------|
| `onOff`   | boolean | `true`, `false` | Power state (true=on, false=off) |

**Handlers**:

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

#### Optional Clusters

- **LevelControl**: Adds brightness control (see Dimmable Light)
- **ScenesManagement**: Enables scene support
- **Groups**: Enables grouping with other devices
- **OccupancySensing**: Can respond to occupancy sensors

#### Complete Example

```typescript
const accessory = {
  uuid: api.matter.uuid.generate('onoff-light-001'),
  displayName: 'On/Off Light',
  deviceType: api.matter.deviceTypes.OnOffLight,
  serialNumber: 'LIGHT-001',
  manufacturer: 'My Company',
  model: 'OnOffLight v1',

  clusters: {
    onOff: {
      onOff: false,  // Initial state: off
    },
  },

  handlers: {
    onOff: {
      on: async () => {
        log.info('[Light] Turning ON')
        await myLightAPI.turnOn()
      },
      off: async () => {
        log.info('[Light] Turning OFF')
        await myLightAPI.turnOff()
      },
    },
  },
}

// Monitor external changes (Flow B)
mqttClient.on('message', (topic, message) => {
  const { state } = JSON.parse(message.toString())
  const deviceIsOn = state === 'ON'

  if (deviceIsOn !== accessory.clusters.onOff.onOff) {
    api.matter.updateAccessoryState(
      accessory.uuid,
      api.matter.clusterNames.OnOff,
      { onOff: deviceIsOn }
    )
  }
})
```

#### Cluster Reference

Access cluster attributes programmatically:

```typescript
// Reading state
const isOn = accessory.clusters.onOff.onOff

// All OnOff cluster attributes via api.matter
const onOffAttrs = api.matter.clusters.OnOffCluster.attributes
console.log(Object.keys(onOffAttrs))
// Output: ['onOff', 'clusterRevision', 'featureMap', ...]
```

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
