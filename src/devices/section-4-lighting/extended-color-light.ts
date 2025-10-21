/**
 * Extended Color Light Device (Matter Spec § 4.4)
 *
 * Handles both variants:
 * - Color Light (HS): Hue/Saturation only
 * - Extended Color Light (HS+CCT): Hue/Saturation + Color Temperature
 *
 * Both use the same Matter device type (ExtendedColorLight) but with different
 * cluster configurations.
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
 * 4. Homebridge AUTOMATICALLY updates Matter state
 * 5. All controllers are notified
 * ✅ No manual state update needed!
 *
 * FLOW B: Physical Device → Home App (MANUAL - you must update state)
 * ────────────────────────────────────────────────────────────────
 * 1. Physical device changes (button, cloud app, automation)
 * 2. ❌ Homebridge has NO IDEA this happened!
 * 3. You MUST monitor device and detect changes
 * 4. You MUST call api.matter.updateAccessoryState() for changed clusters
 * 5. Then all controllers are notified
 *
 * This demonstrates the MOST COMPLEX case with multiple color modes and clusters.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { MatterRequests } from 'homebridge'

import { MatterTypes } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerExtendedColorLight(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  // Variant 1: Color Light (HS only - no CCT)
  if (config.enableColourLight) {
    accessories.push({
      uuid: api.matter.uuid.generate('matter-colour-light'),
      displayName: 'Colour Light (HS)',
      deviceType: api.matter.deviceTypes.ExtendedColorLight,
      serialNumber: 'LIGHT-004',
      manufacturer: 'Matter Examples',
      model: 'ColorLight v1',

      clusters: {
        onOff: {
          onOff: false,
        },
        levelControl: {
          currentLevel: 127,
          minLevel: 1,
          maxLevel: 254,
        },
        colorControl: {
          colorMode: MatterTypes.ColorControl.ColorMode.CurrentHueAndCurrentSaturation, // Hue/Saturation mode
          currentHue: 0, // Red (0 degrees)
          currentSaturation: 254, // Full saturation
          currentX: 41942, // Also provide XY for compatibility
          currentY: 21626,
        },
      },

      handlers: {
        onOff: {
          on: async () => {
            log.info('[Colour Light HS] ✓ Handler `on` called (user controlled via Home app)')
          },
          off: async () => {
            log.info('[Colour Light HS] ✓ Handler `off` called (user controlled via Home app)')
          },
        },
        levelControl: {
          moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
            const { level } = request
            log.info(`[Colour Light HS] ✓ Handler \`moveToLevel\` called with ${level} (${Math.round(level / 254 * 100)}%)`)
          },
        },
        colorControl: {
          moveToColorLogic: async (request: { targetX: number, targetY: number, transitionTime: number }) => {
            const { targetX, targetY, transitionTime } = request
            const xFloat = (targetX / 65535).toFixed(4)
            const yFloat = (targetY / 65535).toFixed(4)
            log.info(`[Colour Light HS] ✓ Handler \`moveToColorLogic\` called with x=${targetX} (~${xFloat}), y=${targetY} (~${yFloat}), transition: ${transitionTime}s`)
          },
          moveToHueAndSaturationLogic: async (request: { targetHue: number, targetSaturation: number, transitionTime: number }) => {
            const { targetHue, targetSaturation, transitionTime } = request
            const hueDegrees = Math.round((targetHue / 254) * 360)
            const saturationPercent = Math.round((targetSaturation / 254) * 100)
            log.info(`[Colour Light HS] ✓ Handler \`moveToHueAndSaturationLogic\` called with hue=${targetHue} (~${hueDegrees}°), saturation=${targetSaturation} (~${saturationPercent}%), transition: ${transitionTime}s`)
          },
          // NOTE: No moveToColorTemperatureLogic handler - this variant only supports color, not CCT
        },
      },
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Variant 2: Extended Color Light (HS + CCT) - THE FULL EXAMPLE
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // This variant supports BOTH color modes:
  // - Color mode (Hue/Saturation or XY)
  // - White mode (Color Temperature in Mireds/Kelvin)
  //
  // HomeKit switches between these modes automatically based on user selection
  // in the Home app.
  if (config.enableExtendedColourLight) {
    const accessory = {
      uuid: api.matter.uuid.generate('matter-extended-colour-light'),
      displayName: 'Extended Colour Light (HS+CCT)',
      deviceType: api.matter.deviceTypes.ExtendedColorLight,
      serialNumber: 'LIGHT-005',
      manufacturer: 'Matter Examples',
      model: 'ExtendedColorLight v1',

      clusters: {
        onOff: {
          onOff: false,
        },
        levelControl: {
          currentLevel: 127,
          minLevel: 1,
          maxLevel: 254,
        },
        colorControl: {
          colorMode: MatterTypes.ColorControl.ColorMode.CurrentHueAndCurrentSaturation, // Hue/Saturation mode
          currentHue: 0, // Red (0 degrees)
          currentSaturation: 254, // Full saturation
          currentX: 41942, // Also provide XY for compatibility
          currentY: 21626,
          colorTemperatureMireds: 250, // ~4000K (for CCT mode)
          colorTempPhysicalMinMireds: 147, // 6800K (coolest)
          colorTempPhysicalMaxMireds: 454, // 2200K (warmest)
          coupleColorTempToLevelMinMireds: 147,
        },
      },

      handlers: {
        onOff: {
          on: async () => {
            log.info('[Extended Colour Light] ✓ Handler `on` called (user controlled via Home app)')
          },
          off: async () => {
            log.info('[Extended Colour Light] ✓ Handler `off` called (user controlled via Home app)')
          },
        },
        levelControl: {
          moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
            const { level } = request
            log.info(`[Extended Colour Light] ✓ Handler \`moveToLevel\` called with ${level} (${Math.round(level / 254 * 100)}%)`)
          },
        },
        colorControl: {
          moveToColorLogic: async (request: { targetX: number, targetY: number, transitionTime: number }) => {
            const { targetX, targetY, transitionTime } = request
            const xFloat = (targetX / 65535).toFixed(4)
            const yFloat = (targetY / 65535).toFixed(4)
            log.info(`[Extended Colour Light] ✓ Handler \`moveToColorLogic\` called with x=${targetX} (~${xFloat}), y=${targetY} (~${yFloat}), transition: ${transitionTime}s`)
          },
          moveToHueAndSaturationLogic: async (request: { targetHue: number, targetSaturation: number, transitionTime: number }) => {
            const { targetHue, targetSaturation, transitionTime } = request
            const hueDegrees = Math.round((targetHue / 254) * 360)
            const saturationPercent = Math.round((targetSaturation / 254) * 100)
            log.info(`[Extended Colour Light] ✓ Handler \`moveToHueAndSaturationLogic\` called with hue=${targetHue} (~${hueDegrees}°), saturation=${targetSaturation} (~${saturationPercent}%), transition: ${transitionTime}s`)
          },
          moveToColorTemperatureLogic: async (request: { targetMireds: number, transitionTime: number }) => {
            const { targetMireds, transitionTime } = request
            const kelvin = Math.round(1000000 / targetMireds)
            log.info(`[Extended Colour Light] ✓ Handler \`moveToColorTemperatureLogic\` called with ${targetMireds} mireds (~${kelvin}K), transition: ${transitionTime}s`)
          },
        },
      },
    }

    accessories.push(accessory)

    // ═════════════════════════════════════════════════════════════════════════════
    // READING STATE: Understanding Extended Color Light State
    // ═════════════════════════════════════════════════════════════════════════════
    //
    // An Extended Color Light has MULTIPLE properties across THREE clusters:
    //
    // 1. onOff cluster (power state):
    //    - onOff: boolean (true = on, false = off)
    //
    // 2. levelControl cluster (brightness):
    //    - currentLevel: number (1-254, where 254 = 100%)
    //
    // 3. colorControl cluster (color/white):
    //    - colorMode: number (0 = HS, 1 = XY, 2 = ColorTemp)
    //    - currentHue: number (0-254, maps to 0-360 degrees)
    //    - currentSaturation: number (0-254, maps to 0-100%)
    //    - currentX: number (0-65535, CIE 1931 x coordinate)
    //    - currentY: number (0-65535, CIE 1931 y coordinate)
    //    - colorTemperatureMireds: number (147-454, reciprocal megakelvin)
    //
    // Example: Reading all properties at once
    const readAllStateExample = () => {
      // Power state
      const isOn = accessory.clusters.onOff.onOff

      // Brightness
      const level = accessory.clusters.levelControl.currentLevel
      const brightnessPercent = Math.round((level / 254) * 100)

      // Color mode
      const mode = accessory.clusters.colorControl.colorMode
      const modeNames: Record<number, string> = {
        [MatterTypes.ColorControl.ColorMode.CurrentHueAndCurrentSaturation]: 'Hue/Saturation',
        [MatterTypes.ColorControl.ColorMode.CurrentXAndCurrentY]: 'XY',
        [MatterTypes.ColorControl.ColorMode.ColorTemperatureMireds]: 'Color Temperature',
      }
      const modeName = modeNames[mode] || 'Unknown'

      // Color values (HS)
      const hue = accessory.clusters.colorControl.currentHue
      const saturation = accessory.clusters.colorControl.currentSaturation
      const hueDegrees = Math.round((hue / 254) * 360)
      const saturationPercent = Math.round((saturation / 254) * 100)

      // Color values (XY)
      const x = accessory.clusters.colorControl.currentX
      const y = accessory.clusters.colorControl.currentY
      const xFloat = (x / 65535).toFixed(4)
      const yFloat = (y / 65535).toFixed(4)

      // White values (Color Temperature)
      const mireds = accessory.clusters.colorControl.colorTemperatureMireds
      const kelvin = Math.round(1000000 / mireds)

      log.info('[Extended Color Light] Complete State:')
      log.info(`  Power: ${isOn ? 'ON' : 'OFF'}`)
      log.info(`  Brightness: ${brightnessPercent}%`)
      log.info(`  Color Mode: ${modeName}`)
      log.info(`  Hue: ${hueDegrees}° (${hue})`)
      log.info(`  Saturation: ${saturationPercent}% (${saturation})`)
      log.info(`  X/Y: ${xFloat}, ${yFloat}`)
      log.info(`  Color Temp: ${kelvin}K (${mireds} mireds)`)
    }

    // Uncomment to log complete state:
    // readAllStateExample()

    // ═════════════════════════════════════════════════════════════════════════════
    // EXTERNAL UPDATES: Updating Extended Color Light State
    // ═════════════════════════════════════════════════════════════════════════════
    //
    // With color lights, you need to handle different scenarios:
    // 1. User changes power (on/off)
    // 2. User changes brightness
    // 3. User changes color (hue/saturation)
    // 4. User changes to white mode (color temperature)
    // 5. Any combination of the above!
    //
    // The key challenge: Your device API might use different formats than Matter

    /**
     * Example: Comprehensive polling for Extended Color Light
     */
    const startPollingExample = () => {
      setInterval(async () => {
        try {
          // ──────────────────────────────────────────────────────────────────────
          // STEP 1: Fetch state from your device
          // ──────────────────────────────────────────────────────────────────────
          // TODO: Replace with your actual device API
          // const state = await myLightAPI.getState(accessory.context.deviceId)
          //
          // Your device might return data like:
          // {
          //   "power": "on",
          //   "brightness": 75,        // 0-100%
          //   "mode": "color",         // "color" or "white"
          //   "hue": 180,              // 0-360 degrees
          //   "saturation": 100,       // 0-100%
          //   "colorTemp": 4000        // Kelvin
          // }

          // For this example, simulate device state:
          // const deviceState = {
          //   power: 'on',
          //   brightness: 75,
          //   mode: 'color',
          //   hue: 180,
          //   saturation: 100,
          //   colorTemp: 4000,
          // }

          // ──────────────────────────────────────────────────────────────────────
          // STEP 2: Read current HomeKit state
          // ──────────────────────────────────────────────────────────────────────
          const homekitIsOn = accessory.clusters.onOff.onOff
          const homekitLevel = accessory.clusters.levelControl.currentLevel
          const homekitBrightnessPercent = Math.round((homekitLevel / 254) * 100)
          const homekitColorMode = accessory.clusters.colorControl.colorMode
          const homekitHue = accessory.clusters.colorControl.currentHue
          const homekitSaturation = accessory.clusters.colorControl.currentSaturation
          const homekitMireds = accessory.clusters.colorControl.colorTemperatureMireds

          // ──────────────────────────────────────────────────────────────────────
          // STEP 3: Compare and update as needed
          // ──────────────────────────────────────────────────────────────────────

          // Power changed?
          // const deviceIsOn = deviceState.power === 'on'
          // if (deviceIsOn !== homekitIsOn) {
          //   log.info(`[Extended Color Light] Power changed: ${deviceIsOn ? 'ON' : 'OFF'}`)
          //   accessory.clusters.onOff.onOff = deviceIsOn
          //   await api.matter.updateAccessoryState(accessory.uuid, api.matter.clusterNames.OnOff, { onOff: deviceIsOn })
          // }

          // Brightness changed?
          // if (deviceState.brightness !== homekitBrightnessPercent) {
          //   log.info(`[Extended Color Light] Brightness changed: ${deviceState.brightness}%`)
          //   const newLevel = Math.max(1, Math.round((deviceState.brightness / 100) * 254))
          //   accessory.clusters.levelControl.currentLevel = newLevel
          //   await api.matter.updateAccessoryState(accessory.uuid, api.matter.clusterNames.LevelControl, { currentLevel: newLevel })
          // }

          // Color mode or values changed?
          // if (deviceState.mode === 'color') {
          //   // ────────────────────────────────────────────────────────────────
          //   // SCENARIO A: Device is in COLOR mode
          //   // ────────────────────────────────────────────────────────────────
          //
          //   // Convert device hue (0-360) to Matter hue (0-254)
          //   const newHue = Math.round((deviceState.hue / 360) * 254)
          //
          //   // Convert device saturation (0-100) to Matter saturation (0-254)
          //   const newSaturation = Math.round((deviceState.saturation / 100) * 254)
          //
          //   // Check if color actually changed
          //   const hueChanged = newHue !== homekitHue
          //   const saturationChanged = newSaturation !== homekitSaturation
          //   const modeChanged = homekitColorMode !== 0 // Not in HS mode
          //
          //   if (hueChanged || saturationChanged || modeChanged) {
          //     log.info(`[Extended Color Light] Color changed: H=${deviceState.hue}° S=${deviceState.saturation}%`)
          //
          //     // IMPORTANT: When updating color, you should update MULTIPLE properties
          //     // to keep HS and XY in sync (HomeKit can use either)
          //
          //     // Update colorMode to indicate we're using Hue/Saturation
          //     accessory.clusters.colorControl.colorMode = MatterTypes.ColorControl.ColorMode.CurrentHueAndCurrentSaturation
          //
          //     // Update hue and saturation
          //     accessory.clusters.colorControl.currentHue = newHue
          //     accessory.clusters.colorControl.currentSaturation = newSaturation
          //
          //     // Optional but recommended: Calculate and update XY values too
          //     // This ensures compatibility with controllers that prefer XY
          //     // You can use a color conversion library for this, or approximate:
          //     // const { x, y } = hueAndSaturationToXY(deviceState.hue, deviceState.saturation)
          //     // accessory.clusters.colorControl.currentX = Math.round(x * 65535)
          //     // accessory.clusters.colorControl.currentY = Math.round(y * 65535)
          //
          //     // Notify HomeKit of all color control changes at once
          //     await api.matter.updateAccessoryState(accessory.uuid, api.matter.clusterNames.ColorControl, {
          //       colorMode: MatterTypes.ColorControl.ColorMode.CurrentHueAndCurrentSaturation,
          //       currentHue: newHue,
          //       currentSaturation: newSaturation,
          //       // currentX: Math.round(x * 65535),
          //       // currentY: Math.round(y * 65535),
          //     })
          //
          //     log.info(`[Extended Color Light] ✓ Updated to color mode: H=${deviceState.hue}° S=${deviceState.saturation}%`)
          //   }
          // } else if (deviceState.mode === 'white') {
          //   // ────────────────────────────────────────────────────────────────
          //   // SCENARIO B: Device is in WHITE mode (Color Temperature)
          //   // ────────────────────────────────────────────────────────────────
          //
          //   // Convert Kelvin to Mireds: mireds = 1,000,000 / kelvin
          //   const newMireds = Math.round(1000000 / deviceState.colorTemp)
          //
          //   // Check if color temp actually changed or mode switched
          //   const miredsChanged = newMireds !== homekitMireds
          //   const modeChanged = homekitColorMode !== MatterTypes.ColorControl.ColorMode.ColorTemperatureMireds // Not in ColorTemp mode
          //
          //   if (miredsChanged || modeChanged) {
          //     log.info(`[Extended Color Light] Color temp changed: ${deviceState.colorTemp}K (${newMireds} mireds)`)
          //
          //     // Update colorMode to indicate we're using Color Temperature
          //     accessory.clusters.colorControl.colorMode = MatterTypes.ColorControl.ColorMode.ColorTemperatureMireds
          //
          //     // Update color temperature
          //     accessory.clusters.colorControl.colorTemperatureMireds = newMireds
          //
          //     // Notify HomeKit
          //     await api.matter.updateAccessoryState(accessory.uuid, api.matter.clusterNames.ColorControl, {
          //       colorMode: MatterTypes.ColorControl.ColorMode.ColorTemperatureMireds,
          //       colorTemperatureMireds: newMireds,
          //     })
          //
          //     log.info(`[Extended Color Light] ✓ Updated to white mode: ${deviceState.colorTemp}K`)
          //   }
          // }
        } catch (error) {
          log.error(`[Extended Color Light] Error polling device state: ${error}`)
        }
      }, 5000)
    }

    // Uncomment to enable polling:
    // startPollingExample()

    /**
     * Example: Event-based updates (MQTT example with color support)
     */
    const startEventListenerExample = () => {
      // Example: MQTT listener that handles color changes
      // mqttClient.subscribe('home/extended-light/state')
      // mqttClient.on('message', async (topic, message) => {
      //   if (topic === 'home/extended-light/state') {
      //     const deviceState = JSON.parse(message.toString())
      //     // Example: { "power": "on", "brightness": 75, "mode": "color", "hue": 180, "saturation": 100 }
      //
      //     let updated = false
      //
      //     // Update power
      //     const deviceIsOn = deviceState.power === 'on'
      //     if (deviceIsOn !== accessory.clusters.onOff.onOff) {
      //       accessory.clusters.onOff.onOff = deviceIsOn
      //       await api.matter.updateAccessoryState(accessory.uuid, api.matter.clusterNames.OnOff, { onOff: deviceIsOn })
      //       updated = true
      //     }
      //
      //     // Update brightness
      //     const currentPercent = Math.round((accessory.clusters.levelControl.currentLevel / 254) * 100)
      //     if (deviceState.brightness !== currentPercent) {
      //       const newLevel = Math.max(1, Math.round((deviceState.brightness / 100) * 254))
      //       accessory.clusters.levelControl.currentLevel = newLevel
      //       await api.matter.updateAccessoryState(accessory.uuid, api.matter.clusterNames.LevelControl, { currentLevel: newLevel })
      //       updated = true
      //     }
      //
      //     // Update color
      //     if (deviceState.mode === 'color') {
      //       const newHue = Math.round((deviceState.hue / 360) * 254)
      //       const newSat = Math.round((deviceState.saturation / 100) * 254)
      //       if (newHue !== accessory.clusters.colorControl.currentHue ||
      //           newSat !== accessory.clusters.colorControl.currentSaturation ||
      //           accessory.clusters.colorControl.colorMode !== MatterTypes.ColorControl.ColorMode.CurrentHueAndCurrentSaturation) {
      //         accessory.clusters.colorControl.colorMode = MatterTypes.ColorControl.ColorMode.CurrentHueAndCurrentSaturation
      //         accessory.clusters.colorControl.currentHue = newHue
      //         accessory.clusters.colorControl.currentSaturation = newSat
      //         await api.matter.updateAccessoryState(accessory.uuid, api.matter.clusterNames.ColorControl, {
      //           colorMode: MatterTypes.ColorControl.ColorMode.CurrentHueAndCurrentSaturation,
      //           currentHue: newHue,
      //           currentSaturation: newSat,
      //         })
      //         updated = true
      //       }
      //     } else if (deviceState.mode === 'white' && deviceState.colorTemp) {
      //       const newMireds = Math.round(1000000 / deviceState.colorTemp)
      //       if (newMireds !== accessory.clusters.colorControl.colorTemperatureMireds ||
      //           accessory.clusters.colorControl.colorMode !== MatterTypes.ColorControl.ColorMode.ColorTemperatureMireds) {
      //         accessory.clusters.colorControl.colorMode = MatterTypes.ColorControl.ColorMode.ColorTemperatureMireds
      //         accessory.clusters.colorControl.colorTemperatureMireds = newMireds
      //         await api.matter.updateAccessoryState(accessory.uuid, api.matter.clusterNames.ColorControl, {
      //           colorMode: MatterTypes.ColorControl.ColorMode.ColorTemperatureMireds,
      //           colorTemperatureMireds: newMireds,
      //         })
      //         updated = true
      //       }
      //     }
      //
      //     if (updated) {
      //       log.info(`[Extended Color Light] ✓ Updated from MQTT`)
      //     }
      //   }
      // })
    }

    // Uncomment to enable event listeners:
    // startEventListenerExample()

    // ═════════════════════════════════════════════════════════════════════════════
    // KEY TAKEAWAYS FOR EXTENDED COLOR LIGHTS:
    // ═════════════════════════════════════════════════════════════════════════════
    //
    // 0. TWO SEPARATE FLOWS (applies to all devices):
    //    FLOW A (Home App → Physical Device):
    //    - Handlers run when user controls via Home app
    //    - You control the physical device
    //    - Homebridge AUTOMATICALLY updates Matter state after handler
    //    - DO NOT call api.matter.updateAccessoryState() in handlers!
    //
    //    FLOW B (Physical Device → Home App):
    //    - Physical device changes externally
    //    - You MUST monitor device and detect changes
    //    - You MUST call api.matter.updateAccessoryState() for changed clusters
    //    - Then all controllers are notified
    //
    // 1. COLOR MODES:
    //    - MatterTypes.ColorControl.ColorMode.CurrentHueAndCurrentSaturation (0): Hue/Saturation (0-254 each)
    //    - MatterTypes.ColorControl.ColorMode.CurrentXAndCurrentY (1): CIE 1931 color space (0-65535 each)
    //    - MatterTypes.ColorControl.ColorMode.ColorTemperatureMireds (2): Color Temperature in mireds
    //    - Always update colorMode when switching between color and white
    //
    // 2. VALUE CONVERSIONS:
    //    Hue:
    //      - Device (degrees): 0-360
    //      - Matter: 0-254
    //      - To Matter: Math.round((degrees / 360) * 254)
    //      - From Matter: Math.round((value / 254) * 360)
    //
    //    Saturation:
    //      - Device (percent): 0-100
    //      - Matter: 0-254
    //      - To Matter: Math.round((percent / 100) * 254)
    //      - From Matter: Math.round((value / 254) * 100)
    //
    //    Color Temperature:
    //      - Device (Kelvin): 2200-6800
    //      - Matter (Mireds): 147-454
    //      - To Mireds: Math.round(1000000 / kelvin)
    //      - To Kelvin: Math.round(1000000 / mireds)
    //
    //    XY (if needed):
    //      - Device (float): 0.0-1.0
    //      - Matter: 0-65535
    //      - To Matter: Math.round(float * 65535)
    //      - From Matter: (value / 65535)
    //
    // 3. UPDATING COLOR STATE (Physical Device → Home App):
    //    - Always update colorMode when switching between color and white
    //    - Use api.matter.updateAccessoryState(uuid, api.matter.clusterNames.ColorControl, { ... })
    //    - Update all color values at once in the attributes object
    //    - Keep HS and XY in sync for best compatibility (use color conversion)
    //    - ONLY use this for FLOW B (external changes), NOT in handlers!
    //
    // 4. READING STATE:
    //    - Check colorMode to know which values are currently active
    //    - CurrentHueAndCurrentSaturation or CurrentXAndCurrentY: Use color values (hue/sat or XY)
    //    - ColorTemperatureMireds: Use colorTemperatureMireds
    //    - Brightness (currentLevel) is independent of color mode
    //    - Access via: accessory.clusters.colorControl.colorMode, etc.
    //
    // 5. COMMON PITFALLS:
    //    - Calling updateAccessoryState() in handlers (it's automatic!)
    //    - Forgetting to update colorMode when switching between color and white
    //    - Using wrong conversion formulas (degrees vs 0-254 range)
    //    - Not handling all three color modes your device supports
    //    - Using old api.matter.updateCluster() instead of updateAccessoryState()
    // ═════════════════════════════════════════════════════════════════════════════
  }

  return accessories
}
