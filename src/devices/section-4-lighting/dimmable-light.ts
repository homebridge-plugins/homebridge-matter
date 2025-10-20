/**
 * Dimmable Light Device (Matter Spec § 4.2)
 *
 * A lighting device with on/off and level control (brightness).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE: THE TWO-WAY FLOW (applies to all Matter accessories)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * FLOW A: Home App → Physical Device (AUTOMATIC - via handlers)
 * ────────────────────────────────────────────────────────────────
 * 1. User controls via Home App
 * 2. Matter command → Homebridge → Your handler runs
 * 3. You control your physical device (API, MQTT, etc.)
 * 4. Homebridge AUTOMATICALLY updates Matter state (calls super methods)
 * 5. All controllers are notified
 * ✅ No manual state update needed!
 *
 * FLOW B: Physical Device → Home App (MANUAL - you must update state)
 * ────────────────────────────────────────────────────────────────
 * 1. Physical device changes (button press, cloud app, automation)
 * 2. ❌ Homebridge has NO IDEA this happened!
 * 3. You MUST monitor device (events/polling) and detect change
 * 4. You MUST call api.matter.updateAccessoryState() to update Matter
 * 5. Then all controllers are notified
 *
 * This example demonstrates BOTH flows with multiple clusters (on/off + brightness).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { MatterRequests } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerDimmableLight(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  if (!config.enableDimmableLight) {
    return accessories
  }

  const accessory = {
    uuid: api.matter.uuid.generate('matter-dimmable-light'),
    displayName: 'Dimmable Light',
    deviceType: api.matter.deviceTypes.DimmableLight,
    serialNumber: 'LIGHT-002',
    manufacturer: 'Matter Examples',
    model: 'DimmableLight v1',

    clusters: {
      onOff: {
        onOff: false, // Initial state: off
      },
      levelControl: {
        currentLevel: 127, // Current brightness: 50% (range 1-254, where 254 = 100%)
        minLevel: 1, // Minimum brightness (Matter spec minimum)
        maxLevel: 254, // Maximum brightness (Matter spec maximum, 0 is reserved for "off")
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // FLOW A: HOME APP → PHYSICAL DEVICE
    // ═══════════════════════════════════════════════════════════════════════════
    // These handlers are called when users control via Home app
    // After your handler runs, Homebridge AUTOMATICALLY updates Matter state
    handlers: {
      onOff: {
        /**
         * Called when user turns the light ON via Home app
         *
         * IMPORTANT: After this handler completes, Homebridge AUTOMATICALLY
         * updates the Matter onOff state and notifies all controllers.
         * You do NOT need to call api.matter.updateAccessoryState() here!
         */
        on: async () => {
          log.info('[Dimmable Light] ✓ Handler `on` called (Home app → Physical device)')

          // ─────────────────────────────────────────────────────────────────────
          // OPTIONAL: Read current state
          // ─────────────────────────────────────────────────────────────────────
          const isOn = accessory.clusters.onOff.onOff
          const brightness = accessory.clusters.levelControl.currentLevel
          const brightnessPercent = Math.round((brightness / 254) * 100)

          log.info(`[Dimmable Light] Current Matter state: ${isOn ? 'ON' : 'OFF'} at ${brightnessPercent}%`)

          // When turning on, the brightness stays at its last value
          // Example: If light was at 80% when turned off, it turns back on at 80%

          // ─────────────────────────────────────────────────────────────────────
          // YOUR JOB: Control your physical device
          // ─────────────────────────────────────────────────────────────────────
          // TODO: Add your actual light control logic here
          // await myLightAPI.turnOn()
          // Note: brightness is already set, just need to turn on

          log.info('[Dimmable Light] Physical device turned ON')

          // Homebridge automatically updates Matter state after this handler
        },

        /**
         * Called when user turns the light OFF via Home app
         */
        off: async () => {
          log.info('[Dimmable Light] ✓ Handler `off` called (Home app → Physical device)')

          const brightness = accessory.clusters.levelControl.currentLevel
          const brightnessPercent = Math.round((brightness / 254) * 100)

          log.info(`[Dimmable Light] Turning off (brightness will remain at ${brightnessPercent}% for next on)`)

          // TODO: Control your physical device
          // await myLightAPI.turnOff()
          // Note: Don't change the brightness value, it's preserved for next "on"

          log.info('[Dimmable Light] Physical device turned OFF')

          // Homebridge automatically updates Matter state to OFF after this handler
        },
      },

      levelControl: {
        /**
         * Called when user changes brightness
         * This handler is called for brightness changes AND can turn the light on/off
         */
        moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
          const { level, transitionTime, optionsMask, optionsOverride } = request

          // Convert Matter level (1-254) to percentage (0-100%)
          const brightnessPercent = Math.round((level / 254) * 100)

          log.info(
            `[Dimmable Light] ✓ Handler \`moveToLevel\` called with level=${level} (${brightnessPercent}%)`,
          )

          // ─────────────────────────────────────────────────────────────────────
          // READING STATE: Check current state before applying change
          // ─────────────────────────────────────────────────────────────────────
          const wasOn = accessory.clusters.onOff.onOff
          const oldLevel = accessory.clusters.levelControl.currentLevel
          const oldPercent = Math.round((oldLevel / 254) * 100)

          log.info(`[Dimmable Light] Changing from ${oldPercent}% to ${brightnessPercent}% (was ${wasOn ? 'ON' : 'OFF'})`)

          // Important note about transitionTime:
          // - transitionTime is in 1/10 second units (tenths of a second)
          // - transitionTime: 10 = 1 second, 50 = 5 seconds
          // - If your device API supports fade/transition, use this value
          if (transitionTime !== undefined && transitionTime !== null) {
            const seconds = transitionTime / 10
            log.info(`[Dimmable Light] Transition time: ${seconds}s`)
          }

          // ─────────────────────────────────────────────────────────────────────
          // CONTROL YOUR DEVICE: Send brightness command
          // ─────────────────────────────────────────────────────────────────────
          // TODO: Replace with your actual device control logic
          //
          // Example 1: API that accepts percentage
          // await myLightAPI.setBrightness(brightnessPercent)
          //
          // Example 2: API that accepts 0-255 range
          // await myLightAPI.setBrightness(level)
          //
          // Example 3: With transition/fade support
          // await myLightAPI.setBrightness(brightnessPercent, transitionTime / 10)
          //
          // Example 4: Cloud API
          // await fetch('https://api.mysmartlight.com/devices/light-002/brightness', {
          //   method: 'PUT',
          //   body: JSON.stringify({ brightness: brightnessPercent })
          // })

          // IMPORTANT: moveToLevelWithOnOff can also turn the light on/off!
          // - If level > 0: Light turns ON at that brightness
          // - If level = 0: Light turns OFF (but some implementations may not allow 0)
          // HomeKit automatically updates both onOff and levelControl clusters after this handler
        },
      },
    },
  }

  accessories.push(accessory)

  // ═════════════════════════════════════════════════════════════════════════════
  // FLOW B: PHYSICAL DEVICE → HOME APP
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // For a dimmable light, you need to monitor TWO properties:
  // 1. On/Off state (onOff cluster)
  // 2. Brightness level (levelControl cluster)
  //
  // When your physical device changes externally, you may need to update one or both.
  //
  // THE KEY API: api.matter.updateAccessoryState(uuid, cluster, attributes)
  // This updates Matter state AND notifies all controllers.

  /**
   * Example: Polling for state changes (checking both on/off and brightness)
   */
  const startPollingExample = () => {
    setInterval(async () => {
      try {
        // TODO: Fetch state from your device
        // const state = await myLightAPI.getState(accessory.context.deviceId)
        // const deviceIsOn = state.power === 'on'
        // const deviceBrightness = state.brightness // Assuming this is 0-100

        // For this example, simulate fetching device state:
        // const deviceIsOn = true
        // const deviceBrightness = 75 // 75%

        // ──────────────────────────────────────────────────────────────────────
        // READING CURRENT MATTER STATE
        // ──────────────────────────────────────────────────────────────────────
        const currentMatterIsOn = accessory.clusters.onOff.onOff
        const currentMatterLevel = accessory.clusters.levelControl.currentLevel
        const currentMatterPercent = Math.round((currentMatterLevel / 254) * 100)

        // ──────────────────────────────────────────────────────────────────────
        // SCENARIO 1: Only on/off changed (brightness stayed the same)
        // ──────────────────────────────────────────────────────────────────────
        // if (deviceIsOn !== currentMatterIsOn) {
        //   log.info(`[Dimmable Light] Physical device power changed: ${deviceIsOn ? 'ON' : 'OFF'}`)
        //
        //   // Update Matter state using Homebridge API
        //   api.matter.updateAccessoryState(
        //     accessory.uuid,
        //     api.matter.clusterNames.OnOff,
        //     { onOff: deviceIsOn },
        //   )
        //
        //   log.info(`[Dimmable Light] ✓ Matter state updated (Physical device → Home app)`)
        // }

        // ──────────────────────────────────────────────────────────────────────
        // SCENARIO 2: Only brightness changed (on/off stayed the same)
        // ──────────────────────────────────────────────────────────────────────
        // if (deviceBrightness !== currentMatterPercent) {
        //   log.info(`[Dimmable Light] Physical device brightness changed: ${deviceBrightness}%`)
        //
        //   // Convert percentage (0-100) to Matter level (1-254)
        //   const newLevel = Math.max(1, Math.round((deviceBrightness / 100) * 254))
        //
        //   // Update Matter state using Homebridge API
        //   api.matter.updateAccessoryState(
        //     accessory.uuid,
        //     api.matter.clusterNames.LevelControl,
        //     { currentLevel: newLevel },
        //   )
        //
        //   log.info(`[Dimmable Light] ✓ Matter state updated: ${deviceBrightness}% (level ${newLevel})`)
        // }

        // ──────────────────────────────────────────────────────────────────────
        // SCENARIO 3: Both on/off AND brightness changed
        // ──────────────────────────────────────────────────────────────────────
        // Update each cluster separately with api.matter.updateAccessoryState()
        // const brightnessChanged = deviceBrightness !== currentMatterPercent
        // const powerChanged = deviceIsOn !== currentMatterIsOn
        //
        // if (powerChanged || brightnessChanged) {
        //   log.info(`[Dimmable Light] Physical device changed - Power: ${deviceIsOn ? 'ON' : 'OFF'}, Brightness: ${deviceBrightness}%`)
        //
        //   // Update on/off if changed
        //   if (powerChanged) {
        //     api.matter.updateAccessoryState(
        //       accessory.uuid,
        //       api.matter.clusterNames.OnOff,
        //       { onOff: deviceIsOn },
        //     )
        //   }
        //
        //   // Update brightness if changed
        //   if (brightnessChanged) {
        //     const newLevel = Math.max(1, Math.round((deviceBrightness / 100) * 254))
        //     api.matter.updateAccessoryState(
        //       accessory.uuid,
        //       api.matter.clusterNames.LevelControl,
        //       { currentLevel: newLevel },
        //     )
        //   }
        //
        //   log.info(`[Dimmable Light] ✓ Matter state updated (Physical device → Home app)`)
        // }
      } catch (error) {
        log.error(`[Dimmable Light] Error polling device state: ${error}`)
      }
    }, 5000) // Poll every 5 seconds
  }

  // Uncomment to enable polling:
  // startPollingExample()

  /**
   * RECOMMENDED: Event-based updates with multiple properties
   *
   * ⚡ This is the BEST approach - instant updates when device changes
   */
  const startEventListenerExample = () => {
    // Example: MQTT listener for a dimmable light
    // import mqtt from 'mqtt'
    // const mqttClient = mqtt.connect('mqtt://your-broker-url')
    //
    // mqttClient.subscribe('home/dimmable-light/status')
    // mqttClient.on('message', (topic, message) => {
    //   if (topic === 'home/dimmable-light/status') {
    //     const deviceState = JSON.parse(message.toString())
    //     // Example payload: { "state": "ON", "brightness": 75 }
    //
    //     const deviceIsOn = deviceState.state === 'ON'
    //     const deviceBrightness = deviceState.brightness // 0-100
    //
    //     // Check what changed compared to current Matter state
    //     const currentMatterIsOn = accessory.clusters.onOff.onOff
    //     const currentMatterPercent = Math.round((accessory.clusters.levelControl.currentLevel / 254) * 100)
    //     const powerChanged = deviceIsOn !== currentMatterIsOn
    //     const brightnessChanged = deviceBrightness !== currentMatterPercent
    //
    //     if (powerChanged || brightnessChanged) {
    //       log.info(`[Dimmable Light] Physical device changed (MQTT): ${deviceIsOn ? 'ON' : 'OFF'} at ${deviceBrightness}%`)
    //
    //       // Update on/off if changed
    //       if (powerChanged) {
    //         api.matter.updateAccessoryState(
    //           accessory.uuid,
    //           api.matter.clusterNames.OnOff,
    //           { onOff: deviceIsOn },
    //         )
    //       }
    //
    //       // Update brightness if changed
    //       if (brightnessChanged) {
    //         const newLevel = Math.max(1, Math.round((deviceBrightness / 100) * 254))
    //         api.matter.updateAccessoryState(
    //           accessory.uuid,
    //           api.matter.clusterNames.LevelControl,
    //           { currentLevel: newLevel },
    //         )
    //       }
    //
    //       log.info(`[Dimmable Light] ✓ Matter state updated (Physical device → Home app)`)
    //     }
    //   }
    // })
  }

  // Uncomment to enable event listeners:
  // startEventListenerExample()

  // ═════════════════════════════════════════════════════════════════════════════
  // KEY TAKEAWAYS FOR MULTI-CLUSTER DEVICES:
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // 1. TWO SEPARATE FLOWS:
  //    FLOW A (Home App → Physical Device):
  //    - Handlers run when user controls via Home app
  //    - You control the physical device
  //    - Homebridge AUTOMATICALLY updates Matter state after handler
  //    - DO NOT call api.matter.updateAccessoryState() in handlers!
  //
  //    FLOW B (Physical Device → Home App):
  //    - Physical device changes externally (button, cloud, automation)
  //    - You MUST monitor device (events/polling) and detect changes
  //    - You MUST call api.matter.updateAccessoryState() for each cluster
  //    - Then all controllers are notified
  //
  // 2. READING MULTIPLE PROPERTIES:
  //    - On/Off: accessory.clusters.onOff.onOff
  //    - Brightness: accessory.clusters.levelControl.currentLevel
  //    - Convert level to %: Math.round((level / 254) * 100)
  //
  // 3. UPDATING MULTIPLE PROPERTIES (Physical Device → Home App):
  //    - Update each cluster separately:
  //      api.matter.updateAccessoryState(uuid, api.matter.clusterNames.OnOff, { onOff: value })
  //      api.matter.updateAccessoryState(uuid, api.matter.clusterNames.LevelControl, { currentLevel: level })
  //    - You can update one or both depending on what changed
  //    - ONLY use this for FLOW B (external changes), NOT in handlers!
  //
  // 4. BRIGHTNESS CONVERSION:
  //    - Matter uses 1-254 range (0 is reserved, means "off")
  //    - Your device API probably uses 0-100 percentage
  //    - Convert TO Matter: Math.max(1, Math.round((percent / 100) * 254))
  //    - Convert FROM Matter: Math.round((level / 254) * 100)
  //
  // 5. HANDLER BEHAVIOR (FLOW A):
  //    - on/off handlers: Only change power state, brightness is preserved
  //    - moveToLevelWithOnOff: Can change BOTH brightness and power state
  //    - If user sets brightness to 0, light may turn off (implementation dependent)
  //    - Homebridge automatically updates Matter state after handlers complete
  //
  // 6. TRANSITION TIME:
  //    - Provided in 1/10 second units (10 = 1 second)
  //    - Use this if your device supports fade/transition effects
  //    - Example: await myLightAPI.setBrightness(level, transitionTime / 10)
  //
  // 7. BEST PRACTICES:
  //    - Always compare states before calling updateAccessoryState() (avoid unnecessary updates)
  //    - Use events (MQTT, WebSocket, webhooks) whenever possible
  //    - Update only the clusters that actually changed
  //    - Log clearly: "Physical device → Home app" vs "Home app → Physical device"
  // ═════════════════════════════════════════════════════════════════════════════

  return accessories
}
