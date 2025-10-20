/**
 * On/Off Light Device (Matter Spec § 4.1)
 *
 * The On/Off Light is a lighting device that is capable of being switched on or off.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CRITICAL ARCHITECTURE UNDERSTANDING - THE TWO-WAY FLOW:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * There are TWO separate flows for a Homebridge Matter plugin:
 *
 * FLOW A: Home App → Physical Device (AUTOMATIC - via handlers)
 * ────────────────────────────────────────────────────────────────
 * 1. User taps in Home App
 * 2. Matter command received by Homebridge
 * 3. Your handler runs (on/off methods below)
 * 4. You control your physical device (API call, MQTT, etc.)
 * 5. Homebridge AUTOMATICALLY updates Matter state
 * 6. All controllers (iPhone, iPad, etc.) are notified
 * ✅ No manual state update needed!
 *
 * FLOW B: Physical Device → Home App (MANUAL - you must update state)
 * ────────────────────────────────────────────────────────────────
 * 1. User presses physical button on device (OR cloud app, automation, etc.)
 * 2. Physical device changes state
 * 3. ❌ Homebridge has NO IDEA this happened!
 * 4. You MUST detect the change (via polling, MQTT, webhook, etc.)
 * 5. You MUST call api.matter.updateAccessoryState() to update Matter
 * 6. Then all controllers are notified
 * ⚠️  If you don't do step 5, Home App shows wrong state!
 *
 * This example demonstrates BOTH flows in detail.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { DeviceContext } from '../types.js'

export function registerOnOffLight(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  if (!config.enableOnOffLight) {
    return accessories
  }

  // Create the accessory configuration
  const accessory = {
    uuid: api.matter.uuid.generate('matter-onoff-light'),
    displayName: 'On/Off Light',
    deviceType: api.matter.deviceTypes.OnOffLight,
    serialNumber: 'LIGHT-001',
    manufacturer: 'Matter Examples',
    model: 'OnOffLight v1',

    // Optional: Store custom data that persists across restarts
    // This works the same as PlatformAccessory.context for HAP accessories
    // Use this to cache device state, API tokens, or any custom data
    // context: {
    //   deviceId: 'my-light-123',
    //   lastKnownState: true,
    //   apiToken: 'your-token-here'
    // },

    // Clusters define the functionality and state of the device
    clusters: {
      onOff: {
        onOff: true, // Initial state: light is on (true) or off (false)
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // FLOW A: HOME APP → PHYSICAL DEVICE
    // ═══════════════════════════════════════════════════════════════════════════
    // These handlers are called when users control the device via Home app
    // After your handler runs, Homebridge AUTOMATICALLY updates the Matter state
    handlers: {
      onOff: {
        /**
         * Called when user turns the light ON via Home app
         *
         * IMPORTANT: After this handler completes successfully, Homebridge
         * AUTOMATICALLY calls super.on() which updates the Matter state to ON
         * and notifies all connected devices. You don't need to manually update state!
         */
        on: async () => {
          log.info('[On/Off Light] ✓ Handler `on` called (Home app → Physical device)')

          // ─────────────────────────────────────────────────────────────────────
          // OPTIONAL: Read current state before change
          // ─────────────────────────────────────────────────────────────────────
          const currentState = accessory.clusters.onOff.onOff
          log.info(`[On/Off Light] Current Matter state: ${currentState ? 'ON' : 'OFF'}`)

          // ─────────────────────────────────────────────────────────────────────
          // YOUR JOB: Control your physical device
          // ─────────────────────────────────────────────────────────────────────
          // TODO: Replace this with your actual device control logic
          //
          // Example 1: Cloud API
          // await fetch('https://api.mysmartlight.com/devices/light-001/on', {
          //   method: 'POST',
          //   headers: { 'Authorization': `Bearer ${accessory.context.apiToken}` }
          // })
          //
          // Example 2: Local HTTP API
          // await fetch('http://192.168.1.50/api/light/on')
          //
          // Example 3: MQTT
          // mqttClient.publish('home/light-001/command', JSON.stringify({ state: 'ON' }))
          //
          // Example 4: Custom library
          // await myLightAPI.turnOn(accessory.context.deviceId)

          log.info('[On/Off Light] Physical device turned ON')

          // ─────────────────────────────────────────────────────────────────────
          // AUTOMATIC: Homebridge updates Matter state after this handler
          // ─────────────────────────────────────────────────────────────────────
          // You don't need to call api.matter.updateAccessoryState() here!
          // Homebridge automatically:
          // 1. Calls super.on() which sets this.state.onOff = true
          // 2. Syncs to cache for persistence
          // 3. Notifies all Matter controllers
        },

        /**
         * Called when user turns the light OFF via Home app
         */
        off: async () => {
          log.info('[On/Off Light] ✓ Handler `off` called (Home app → Physical device)')

          const currentState = accessory.clusters.onOff.onOff
          log.info(`[On/Off Light] Current Matter state: ${currentState ? 'ON' : 'OFF'}`)

          // TODO: Control your physical device
          // Example: await myLightAPI.turnOff(accessory.context.deviceId)

          log.info('[On/Off Light] Physical device turned OFF')

          // Homebridge automatically updates Matter state to OFF after this handler
        },
      },
    },
  }

  accessories.push(accessory)

  // ═════════════════════════════════════════════════════════════════════════════
  // FLOW B: PHYSICAL DEVICE → HOME APP
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // CRITICAL: The handlers above only run when the user controls via Home app.
  // But what if your light changes state externally? For example:
  // - User presses physical button on the light
  // - User controls via manufacturer's cloud app
  // - Automation from another system
  // - Device state changes independently
  //
  // In these cases, Homebridge has NO IDEA the device changed!
  // You MUST monitor your device and call api.matter.updateAccessoryState()
  //
  // WHY NO AUTOMATIC DETECTION?
  // Your physical device is NOT a Matter device - it's a regular IoT device
  // (cloud API, HTTP, MQTT, etc.). The virtual Matter device in Homebridge
  // can't magically detect when the physical device changes. YOU must tell it!
  //
  // THE KEY API: api.matter.updateAccessoryState(uuid, cluster, attributes)
  // This updates the Matter state AND notifies all connected controllers.

  /**
   * RECOMMENDED: Event-based updates (MQTT, WebSocket, webhooks, SSE)
   *
   * This is the BEST approach if your device supports push notifications.
   * When your device changes, you get instant notification and update Matter.
   *
   * ⚡ Pros: Instant updates, efficient, the best user experience
   * ⚠️  Requires: Device API that supports events/push notifications
   */
  const startEventListenerExample = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // Example A: MQTT listener
    // ───────────────────────────────────────────────────────────────────────────
    // import mqtt from 'mqtt'
    // const mqttClient = mqtt.connect('mqtt://your-broker-url')
    //
    // mqttClient.subscribe('home/light-001/status')  // Subscribe to status topic
    // mqttClient.on('message', (topic, message) => {
    //   if (topic === 'home/light-001/status') {
    //     const deviceState = JSON.parse(message.toString())
    //     const deviceIsOn = deviceState.state === 'ON'
    //
    //     // Check if state actually changed (avoid unnecessary updates)
    //     const currentMatterState = accessory.clusters.onOff.onOff
    //     if (deviceIsOn !== currentMatterState) {
    //       log.info(`[On/Off Light] Physical device changed (MQTT): ${deviceIsOn ? 'ON' : 'OFF'}`)
    //
    //       // ─────────────────────────────────────────────────────────────────
    //       // UPDATE MATTER STATE: This is the critical API call!
    //       // ─────────────────────────────────────────────────────────────────
    //       api.matter.updateAccessoryState(
    //         accessory.uuid,                    // UUID of the accessory
    //         api.matter.clusterNames.OnOff,     // Cluster name (use constants!)
    //         { onOff: deviceIsOn },             // New attribute values
    //       )
    //
    //       // This updates the Matter state AND notifies all controllers
    //       log.info(`[On/Off Light] ✓ Matter state updated (Physical device → Home app)`)
    //     }
    //   }
    // })

    // ───────────────────────────────────────────────────────────────────────────
    // Example B: WebSocket listener
    // ───────────────────────────────────────────────────────────────────────────
    // import WebSocket from 'ws'
    // const ws = new WebSocket('wss://api.mysmartlight.com/devices/light-001/events')
    //
    // ws.on('message', (data) => {
    //   const event = JSON.parse(data.toString())
    //   if (event.type === 'state_changed') {
    //     const deviceIsOn = event.state === 'ON'
    //     const currentMatterState = accessory.clusters.onOff.onOff
    //
    //     if (deviceIsOn !== currentMatterState) {
    //       log.info(`[On/Off Light] Physical device changed (WebSocket): ${deviceIsOn ? 'ON' : 'OFF'}`)
    //
    //       api.matter.updateAccessoryState(
    //         accessory.uuid,
    //         api.matter.clusterNames.OnOff,
    //         { onOff: deviceIsOn },
    //       )
    //
    //       log.info(`[On/Off Light] ✓ Matter state updated`)
    //     }
    //   }
    // })
    //
    // // Handle reconnection on disconnect
    // ws.on('close', () => {
    //   log.warn('[On/Off Light] WebSocket disconnected, reconnecting in 5s...')
    //   setTimeout(() => startEventListenerExample(), 5000)
    // })

    // ───────────────────────────────────────────────────────────────────────────
    // Example C: HTTP Webhook listener (requires setting up an HTTP server)
    // ───────────────────────────────────────────────────────────────────────────
    // import express from 'express'
    // const app = express()
    // app.use(express.json())
    //
    // app.post('/webhook/light-001/state', (req, res) => {
    //   const deviceIsOn = req.body.state === 'ON'
    //   const currentMatterState = accessory.clusters.onOff.onOff
    //
    //   if (deviceIsOn !== currentMatterState) {
    //     log.info(`[On/Off Light] Physical device changed (webhook): ${deviceIsOn ? 'ON' : 'OFF'}`)
    //
    //     api.matter.updateAccessoryState(
    //       accessory.uuid,
    //       api.matter.clusterNames.OnOff,
    //       { onOff: deviceIsOn },
    //     )
    //
    //     log.info(`[On/Off Light] ✓ Matter state updated`)
    //   }
    //   res.sendStatus(200)
    // })
    //
    // app.listen(3000, () => log.info('[On/Off Light] Webhook server listening on port 3000'))

    // ───────────────────────────────────────────────────────────────────────────
    // Example D: Server-Sent Events (SSE)
    // ───────────────────────────────────────────────────────────────────────────
    // const EventSource = require('eventsource')
    // const eventSource = new EventSource('https://api.mysmartlight.com/devices/light-001/events')
    //
    // eventSource.addEventListener('state', (event) => {
    //   const data = JSON.parse(event.data)
    //   const deviceIsOn = data.power === 'on'
    //   const currentMatterState = accessory.clusters.onOff.onOff
    //
    //   if (deviceIsOn !== currentMatterState) {
    //     log.info(`[On/Off Light] Physical device changed (SSE): ${deviceIsOn ? 'ON' : 'OFF'}`)
    //
    //     api.matter.updateAccessoryState(
    //       accessory.uuid,
    //       api.matter.clusterNames.OnOff,
    //       { onOff: deviceIsOn },
    //     )
    //
    //     log.info(`[On/Off Light] ✓ Matter state updated`)
    //   }
    // })
  }

  // Uncomment to enable event listeners:
  // startEventListenerExample()

  /**
   * FALLBACK: Polling-based updates (only if events aren't available)
   *
   * Use this approach ONLY if your device doesn't support push notifications.
   * Polling is less efficient and has delays, but works with any REST API.
   *
   * 🐢 Pros: Works with any HTTP API
   * ⚠️  Cons: Delayed updates, higher overhead, can strain APIs
   */
  const startPollingExample = () => {
    // Poll every 5-10 seconds (adjust based on your needs)
    // WARNING: Frequent polling can strain your device's API and network
    setInterval(async () => {
      try {
        // ─────────────────────────────────────────────────────────────────────
        // STEP 1: Fetch state from your physical device
        // ─────────────────────────────────────────────────────────────────────
        // TODO: Replace with your actual device state fetching logic
        //
        // Example 1: REST API
        // const response = await fetch('https://api.mysmartlight.com/devices/light-001/state')
        // const data = await response.json()
        // const deviceIsOn = data.state === 'ON'
        //
        // Example 2: Custom library
        // const deviceIsOn = await myLightAPI.getState(accessory.context.deviceId)
        //
        // Example 3: Local device
        // const deviceIsOn = await fetch('http://192.168.1.50/status').then(r => r.json()).then(d => d.on)

        // For this example, simulate fetching device state
        // const deviceIsOn = true

        // ─────────────────────────────────────────────────────────────────────
        // STEP 2: Compare with current Matter state
        // ─────────────────────────────────────────────────────────────────────
        // const currentMatterState = accessory.clusters.onOff.onOff
        //
        // // Only update if the state actually changed (avoid unnecessary updates)
        // if (deviceIsOn !== currentMatterState) {
        //   log.info(`[On/Off Light] Physical device changed (polling): ${deviceIsOn ? 'ON' : 'OFF'}`)
        //
        //   // ───────────────────────────────────────────────────────────────────
        //   // STEP 3: Update Matter state
        //   // ───────────────────────────────────────────────────────────────────
        //   api.matter.updateAccessoryState(
        //     accessory.uuid,
        //     api.matter.clusterNames.OnOff,
        //     { onOff: deviceIsOn },
        //   )
        //
        //   log.info(`[On/Off Light] ✓ Matter state updated (Physical device → Home app)`)
        // }
      } catch (error) {
        log.error(`[On/Off Light] Error polling device state: ${error}`)
      }
    }, 5000) // Poll every 5 seconds (adjust as needed)
  }

  // Uncomment to enable polling (only if events aren't available):
  // startPollingExample()

  // ═════════════════════════════════════════════════════════════════════════════
  // KEY TAKEAWAYS - THE TWO-WAY FLOW:
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // 1. TWO SEPARATE FLOWS:
  //    FLOW A (Home App → Physical Device):
  //    - Your handler runs when user controls via Home app
  //    - You control the physical device (API call, MQTT, etc.)
  //    - Homebridge AUTOMATICALLY updates Matter state after your handler
  //    - DO NOT call api.matter.updateAccessoryState() in handlers!
  //
  //    FLOW B (Physical Device → Home App):
  //    - Physical device changes (button press, cloud app, etc.)
  //    - Homebridge has NO IDEA this happened!
  //    - You MUST monitor device (events/polling) and detect the change
  //    - You MUST call api.matter.updateAccessoryState() to update Matter
  //    - Then all controllers are notified
  //
  // 2. READING STATE:
  //    - Access via: accessory.clusters.onOff.onOff
  //    - This gives you the current Matter state
  //    - Use this to compare with physical device state before updating
  //
  // 3. UPDATING STATE (Physical Device → Home App):
  //    - Use the Homebridge API:
  //      api.matter.updateAccessoryState(
  //        accessory.uuid,
  //        api.matter.clusterNames.OnOff,
  //        { onOff: newValue }
  //      )
  //    - This updates Matter state AND notifies all controllers
  //    - ONLY use this for external changes (FLOW B), NOT in handlers (FLOW A)!
  //
  // 4. WHY NO AUTOMATIC DETECTION?
  //    - Your physical device is NOT a Matter device (it's HTTP, MQTT, cloud, etc.)
  //    - The virtual Matter device in Homebridge can't detect physical changes
  //    - You must explicitly monitor your device and call updateAccessoryState()
  //
  // 5. CHOOSING MONITORING METHOD:
  //    Event-based (RECOMMENDED): MQTT, WebSocket, webhooks, SSE
  //      ✅ Instant updates
  //      ✅ More efficient
  //      ✅ Better user experience
  //      ✅ Lower overhead
  //
  //    Polling (FALLBACK): Only if device has no event support
  //      ⚠️  Delayed updates (depends on interval)
  //      ⚠️  Higher network overhead
  //      ⚠️  Can strain device APIs
  //      ⚠️  Use 5-10 second intervals minimum
  //
  // 6. BEST PRACTICES:
  //    - Always compare states before calling updateAccessoryState() (avoid unnecessary updates)
  //    - Use events whenever possible for better performance
  //    - Handle errors gracefully in monitoring logic
  //    - Store connection objects (MQTT, WebSocket) for cleanup on plugin shutdown
  //    - Reconnect automatically if event connection drops
  //    - Log clearly: "Physical device → Home app" vs "Home app → Physical device"
  //
  // 7. DISCOVERING CLUSTER ATTRIBUTES & TYPES:
  //    Q: "How do I know what attributes are available for my device type?"
  //    A: Three ways to discover this:
  //
  //    METHOD 1: TypeScript Autocomplete (EASIEST for simple types)
  //    When you type `accessory.clusters.`, TypeScript will show available clusters.
  //    When you type `onOff: `, TypeScript knows the type (boolean).
  //    This works well for simple types like booleans and numbers.
  //
  //    METHOD 2: Programmatic Discovery (for attribute names)
  //    All clusters are available via api.matter.clusters:
  //    ```typescript
  //    // See all OnOff attributes
  //    const onOffAttrs = api.matter.clusters.OnOffCluster.attributes
  //    console.log(Object.keys(onOffAttrs))
  //    // Shows: ['onOff', 'clusterRevision', 'featureMap', ...]
  //
  //    // See all FanControl attributes
  //    const fanAttrs = api.matter.clusters.FanControlCluster.attributes
  //    console.log(Object.keys(fanAttrs))
  //    // Shows: ['fanMode', 'fanModeSequence', 'percentSetting', 'percentCurrent', ...]
  //    ```
  //
  //    METHOD 3: MatterTypes Namespace (BEST - for enum values with type safety!)
  //    Homebridge exports ALL Matter.js cluster types via the MatterTypes namespace.
  //    This gives you full access to enums, types, and constants with TypeScript autocomplete!
  //
  //    EXAMPLE: Fan Speed Values (using MatterTypes)
  //    For a fan, you might wonder: "What values can fanMode accept?"
  //    ```typescript
  //    import { MatterTypes } from 'homebridge'
  //
  //    // Access FanMode enum with full type safety and autocomplete
  //    api.matter.updateAccessoryState(
  //      fanUuid,
  //      api.matter.clusterNames.FanControl,
  //      { fanMode: MatterTypes.FanControl.FanMode.High }
  //    )
  //
  //    // All FanMode values available:
  //    // - MatterTypes.FanControl.FanMode.Off      (0)
  //    // - MatterTypes.FanControl.FanMode.Low      (1)
  //    // - MatterTypes.FanControl.FanMode.Medium   (2)
  //    // - MatterTypes.FanControl.FanMode.High     (3)
  //    // - MatterTypes.FanControl.FanMode.On       (4)
  //    // - MatterTypes.FanControl.FanMode.Auto     (5)
  //    // - MatterTypes.FanControl.FanMode.Smart    (6)
  //    ```
  //
  //    EXAMPLE: Thermostat System Mode (using MatterTypes)
  //    ```typescript
  //    import { MatterTypes } from 'homebridge'
  //
  //    api.matter.updateAccessoryState(
  //      thermostatUuid,
  //      api.matter.clusterNames.Thermostat,
  //      {
  //        localTemperature: 2200,           // 22.00°C (hundredths)
  //        occupiedHeatingSetpoint: 2000,    // 20.00°C
  //        occupiedCoolingSetpoint: 2400,    // 24.00°C
  //        systemMode: MatterTypes.Thermostat.SystemMode.Heat,
  //      }
  //    )
  //
  //    // All SystemMode values available:
  //    // - MatterTypes.Thermostat.SystemMode.Off             (0)
  //    // - MatterTypes.Thermostat.SystemMode.Auto            (1)
  //    // - MatterTypes.Thermostat.SystemMode.Cool            (3)
  //    // - MatterTypes.Thermostat.SystemMode.Heat            (4)
  //    // - MatterTypes.Thermostat.SystemMode.EmergencyHeat   (5)
  //    // - MatterTypes.Thermostat.SystemMode.Precooling      (6)
  //    // - MatterTypes.Thermostat.SystemMode.FanOnly         (7)
  //    ```
  //
  //    EXAMPLE: Door Lock State (using MatterTypes)
  //    ```typescript
  //    import { MatterTypes } from 'homebridge'
  //
  //    api.matter.updateAccessoryState(
  //      lockUuid,
  //      api.matter.clusterNames.DoorLock,
  //      { lockState: MatterTypes.DoorLock.LockState.Locked }
  //    )
  //
  //    // All LockState values available:
  //    // - MatterTypes.DoorLock.LockState.NotFullyLocked  (0)
  //    // - MatterTypes.DoorLock.LockState.Locked          (1)
  //    // - MatterTypes.DoorLock.LockState.Unlocked        (2)
  //    ```
  //
  //    DISCOVERING ENUM VALUES:
  //    Three ways to find available enum values:
  //    1. TypeScript Autocomplete: Type `MatterTypes.FanControl.` and see suggestions
  //    2. Matter.js Reference: https://github.com/project-chip/matter.js
  //    3. Matter Specification: https://csa-iot.org/developer-resource/specifications-download-request/
  //
  //    ALL AVAILABLE CLUSTERS IN MatterTypes:
  //    MatterTypes exports ALL 130+ Matter clusters using original matter.js names:
  //    - MatterTypes.FanControl
  //    - MatterTypes.Thermostat
  //    - MatterTypes.DoorLock
  //    - MatterTypes.ColorControl
  //    - MatterTypes.WindowCovering
  //    - MatterTypes.SmokeCoAlarm
  //    - MatterTypes.OccupancySensing
  //    - MatterTypes.TemperatureMeasurement
  //    - ... and 120+ more!
  //
  //    COMMON ATTRIBUTE VALUE TYPES:
  //    - Boolean: true/false (e.g., onOff, occupied)
  //    - Uint8/Uint16: 0-254, 0-100, 0-65535 (e.g., currentLevel, hue, saturation)
  //    - Enum: Use MatterTypes for type-safe enum values (see examples above)
  //    - Temperature: Usually in hundredths of degrees C (2500 = 25.00°C)
  //    - Percentage: Usually 0-100 for sensors, 0-254 for controls (Matter range)
  // ═════════════════════════════════════════════════════════════════════════════

  return accessories
}
