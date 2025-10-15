import type {
  API,
  DynamicPlatformPlugin,
  Logging,
  MatterRequests,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge'

/**
 * MatterPlatform
 * Demonstrates all available Matter device types in Homebridge
 */
export class ExampleHomebridgePlatform implements DynamicPlatformPlugin {
  // Track restored cached accessories (required for DynamicPlatformPlugin)
  public readonly accessories: Map<string, PlatformAccessory> = new Map()

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name)

    // Check if the user has matter enabled
    if (!this.api.isMatterEnabled?.()) {
      this.log.warn('Matter is not enabled in Homebridge. Please enable Matter in the Homebridge settings to use this plugin.')
      return
    }

    // Register Matter accessories when Homebridge has finished launching
    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback')
      this.registerMatterAccessories()
    })
  }

  /**
   * Required for DynamicPlatformPlugin
   * Called when homebridge restores cached accessories from disk at startup
   */
  configureAccessory(/* accessory: PlatformAccessory */) {
    // Note this is not used for Matter accessories, as they are registered dynamically
  }

  /**
   * Register all Matter accessory examples
   */
  private registerMatterAccessories() {
    this.log.info('Registering Matter accessories...')

    // Register each device type
    this.registerLightingDevices()
    // this.registerSwitchesAndOutlets();
    // this.registerSensors();
    // this.registerHVAC();
    // this.registerSecurity();
    // this.registerOtherDevices();

    this.log.info('Finished registering Matter accessories')

    // You can read current state using the API
    const onOffState = this.api.matter.getAccessoryState('matter-dimmable-light', this.api.matter.clusterNames.OnOff)
    if (onOffState) {
      this.log.info(`[On/Off Light] 📖 Reading Dimmable Light on/off via API: ${onOffState.onOff ? 'ON' : 'OFF'}`)
    }

    const levelState = this.api.matter.getAccessoryState('matter-dimmable-light', this.api.matter.clusterNames.LevelControl)
    if (levelState) {
      this.log.info(`[On/Off Light] 📖 Reading Dimmable Light brightness via API: ${levelState.currentLevel} (${Math.round((levelState?.currentLevel || 0) / 254 * 100)}%)`)
    }

    // // ═══════════════════════════════════════════════════════════════
    // // PATTERN 2 DEMONSTRATION: Update Dimmable Light WITHOUT handler
    // // ═══════════════════════════════════════════════════════════════
    // // Simulating: Dimmable light state changed externally (like via native app)
    // // This will update the Home app WITHOUT triggering the dimmable light's handler
    // // Note: Homebridge automatically defers the update to avoid transaction conflicts
    // this.log.info('[On/Off Light] → Updating Dimmable Light state using updateMatterAccessoryState (no handler!)')
    //
    // this.api.matter.updateAccessoryState(uuidLightDimmable, this.api.matter.clusterNames.OnOff, {
    //   onOff: true,
    // })
  }

  /**
   * Lighting Devices
   */
  private registerLightingDevices() {
    const uuidLightOnOff = this.api.matter.uuid.generate('matter-onoff-light')
    const uuidLightDimmable = this.api.matter.uuid.generate('matter-dimmable-light')
    const uuidLightColourTemp = this.api.matter.uuid.generate('matter-colour-temp-light')
    const uuidLightColour = this.api.matter.uuid.generate('matter-colour-light')
    const uuidLightExtendedColour = this.api.matter.uuid.generate('matter-extended-colour-light')

    // 1. On/Off Light
    this.api.matter.registerAccessory({
      uuid: uuidLightOnOff,
      displayName: 'On/Off Light',
      deviceType: this.api.matter.deviceTypes.OnOffLight,
      serialNumber: 'LIGHT-001',
      manufacturer: 'Matter Examples',
      model: 'OnOffLight v1',

      clusters: {
        onOff: {
          onOff: true,
        },
      },

      // These are called when the user controls the accessory via the Home app
      handlers: {
        onOff: {
          on: async (/* no args */) => {
            this.log.info('[On/Off Light] ✓ Handler `on` called (user controlled via Home app)')
          },
          off: async (/* no args */) => {
            this.log.info('[On/Off Light] ✓ Handler `off` called (user controlled via Home app)')
          },
        },
      },
    })

    // 2. Dimmable Light
    this.api.matter.registerAccessory({
      uuid: uuidLightDimmable,
      displayName: 'Dimmable Light',
      deviceType: this.api.matter.deviceTypes.DimmableLight,
      serialNumber: 'LIGHT-002',
      manufacturer: 'Matter Examples',
      model: 'DimmableLight v1',

      clusters: {
        onOff: {
          onOff: false,
        },
        levelControl: {
          currentLevel: 127,
          minLevel: 1,
          maxLevel: 254,
        },
      },

      // These are called when the user controls the accessory via the Home app
      handlers: {
        onOff: {
          on: async () => {
            this.log.info('[Dimmable Light] ✓ Handler `on` called (user controlled via Home app)')
          },
          off: async () => {
            this.log.info('[Dimmable Light] ✓ Handler `off` called (user controlled via Home app)')
          },
        },
        levelControl: {
          moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
            const { level } = request
            this.log.info(`[Dimmable Light] ✓ Handler \`moveToLevel\` called with ${level} (${Math.round(level / 254 * 100)}%)`)
          },
        },
      },
    })

    // 3. Colour Temperature Light
    this.api.matter.registerAccessory({
      uuid: uuidLightColourTemp,
      displayName: 'Colour Temperature Light',
      deviceType: this.api.matter.deviceTypes.ColorTemperatureLight,
      serialNumber: 'LIGHT-003',
      manufacturer: 'Matter Examples',
      model: 'ColourTempLight v1',

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
          colorMode: 2, // Colour temperature mode
          colorTemperatureMireds: 250, // ~4000K
          colorTempPhysicalMinMireds: 147, // 6800K (coolest)
          colorTempPhysicalMaxMireds: 454, // 2200K (warmest)
          coupleColorTempToLevelMinMireds: 147,
        },
      },

      // These are called when the user controls the accessory via the Home app
      handlers: {
        onOff: {
          on: async (/* no args */) => {
            this.log.info('[Colour Temp Light] handler `on` called (user controlled via Home app)')
          },
          off: async (/* no args */) => {
            this.log.info('[Colour Temp Light] Turned `off` called (user controlled via Home app)')
          },
        },
        levelControl: {
          moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
            const { level } = request
            this.log.info(`[Colour Light] ✓ Handler \`moveToLevel\` called with ${level} (${Math.round(level / 254 * 100)}%)`)
          },
        },
        colorControl: {
          moveToColorTemperatureLogic: async (request: { targetMireds: number, transitionTime: number }) => {
            const { targetMireds, transitionTime } = request
            const kelvin = Math.round(1000000 / targetMireds)
            this.log.info(`[Colour Temp Light] ✓ Handler \`moveToColorTemperatureLogic\` called with ${targetMireds} mireds (~${kelvin}K), transition: ${transitionTime}s`)
          },
        },
      },
    })

    // 4. Colour Light (Hue/Saturation ONLY - no CCT)
    this.api.matter.registerAccessory({
      uuid: uuidLightColour,
      displayName: 'Colour Light (HS)',
      deviceType: this.api.matter.deviceTypes.ExtendedColorLight,
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
          colorMode: 0, // Hue/Saturation mode
          currentHue: 0, // Red (0 degrees)
          currentSaturation: 254, // Full saturation
          currentX: 41942, // Also provide XY for compatibility
          currentY: 21626,
        },
      },

      // These are called when the user controls the accessory via the Home app
      handlers: {
        onOff: {
          on: async () => {
            this.log.info('[Colour Light HS] ✓ Handler `on` called (user controlled via Home app)')
          },
          off: async () => {
            this.log.info('[Colour Light HS] ✓ Handler `off` called (user controlled via Home app)')
          },
        },
        levelControl: {
          moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
            const { level } = request
            this.log.info(`[Colour Light HS] ✓ Handler \`moveToLevel\` called with ${level} (${Math.round(level / 254 * 100)}%)`)
          },
        },
        colorControl: {
          moveToColorLogic: async (request: { targetX: number, targetY: number, transitionTime: number }) => {
            const { targetX, targetY, transitionTime } = request
            const xFloat = (targetX / 65535).toFixed(4)
            const yFloat = (targetY / 65535).toFixed(4)
            this.log.info(`[Colour Light HS] ✓ Handler \`moveToColorLogic\` called with x=${targetX} (~${xFloat}), y=${targetY} (~${yFloat}), transition: ${transitionTime}s`)
          },
          moveToHueAndSaturationLogic: async (request: { targetHue: number, targetSaturation: number, transitionTime: number }) => {
            const { targetHue, targetSaturation, transitionTime } = request
            const hueDegrees = Math.round((targetHue / 254) * 360)
            const saturationPercent = Math.round((targetSaturation / 254) * 100)
            this.log.info(`[Colour Light HS] ✓ Handler \`moveToHueAndSaturationLogic\` called with hue=${targetHue} (~${hueDegrees}°), saturation=${targetSaturation} (~${saturationPercent}%), transition: ${transitionTime}s`)
          },
          // NOTE: No moveToColorTemperatureLogic handler - this light only supports color, not CCT
        },
      },
    })

    // 5. Extended Colour Light (Hue/Saturation + CCT)
    this.api.matter.registerAccessory({
      uuid: uuidLightExtendedColour,
      displayName: 'Extended Colour Light (HS+CCT)',
      deviceType: this.api.matter.deviceTypes.ExtendedColorLight,
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
          colorMode: 0, // Hue/Saturation mode
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

      // These are called when the user controls the accessory via the Home app
      handlers: {
        onOff: {
          on: async () => {
            this.log.info('[Extended Colour Light] ✓ Handler `on` called (user controlled via Home app)')
          },
          off: async () => {
            this.log.info('[Extended Colour Light] ✓ Handler `off` called (user controlled via Home app)')
          },
        },
        levelControl: {
          moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
            const { level } = request
            this.log.info(`[Extended Colour Light] ✓ Handler \`moveToLevel\` called with ${level} (${Math.round(level / 254 * 100)}%)`)
          },
        },
        colorControl: {
          moveToColorLogic: async (request: { targetX: number, targetY: number, transitionTime: number }) => {
            const { targetX, targetY, transitionTime } = request
            const xFloat = (targetX / 65535).toFixed(4)
            const yFloat = (targetY / 65535).toFixed(4)
            this.log.info(`[Extended Colour Light] ✓ Handler \`moveToColorLogic\` called with x=${targetX} (~${xFloat}), y=${targetY} (~${yFloat}), transition: ${transitionTime}s`)
          },
          moveToHueAndSaturationLogic: async (request: { targetHue: number, targetSaturation: number, transitionTime: number }) => {
            const { targetHue, targetSaturation, transitionTime } = request
            const hueDegrees = Math.round((targetHue / 254) * 360)
            const saturationPercent = Math.round((targetSaturation / 254) * 100)
            this.log.info(`[Extended Colour Light] ✓ Handler \`moveToHueAndSaturationLogic\` called with hue=${targetHue} (~${hueDegrees}°), saturation=${targetSaturation} (~${saturationPercent}%), transition: ${transitionTime}s`)
          },
          moveToColorTemperatureLogic: async (request: { targetMireds: number, transitionTime: number }) => {
            const { targetMireds, transitionTime } = request
            const kelvin = Math.round(1000000 / targetMireds)
            this.log.info(`[Extended Colour Light] ✓ Handler \`moveToColorTemperatureLogic\` called with ${targetMireds} mireds (~${kelvin}K), transition: ${transitionTime}s`)
          },
        },
      },
    })
  }
}
