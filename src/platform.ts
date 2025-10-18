import type {
  API,
  DynamicPlatformPlugin,
  Logging,
  MatterRequests,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge'

import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js'

/**
 * MatterPlatform
 * Demonstrates all available Matter device types in Homebridge
 */
export class ExampleHomebridgePlatform implements DynamicPlatformPlugin {
  // Track restored HAP cached accessories (required for DynamicPlatformPlugin)
  public readonly accessories: Map<string, PlatformAccessory> = new Map()

  // Track restored Matter cached accessories
  public readonly matterAccessories: Map<string, any> = new Map()

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
  configureAccessory(accessory: PlatformAccessory) {
    // Note this is not used for Matter accessories - use configureMatterAccessory instead
    this.accessories.set(accessory.UUID, accessory)
  }

  /**
   * Called for each cached Matter accessory restored from disk
   * Track these so we can determine which accessories to remove in didFinishLaunching
   */
  configureMatterAccessory(accessory: any) {
    this.log.info(`✓ Restored Matter accessory from cache: ${accessory.displayName}`)
    // Track cached Matter accessories (in real plugin, compare with cloud devices and remove orphans)
    this.matterAccessories.set(accessory.uuid, accessory)
  }

  /**
   * Register all Matter accessory examples
   */
  private registerMatterAccessories() {
    this.log.info('='.repeat(80))
    this.log.info('HAP cached accessories:', this.accessories.size)
    this.log.info('Matter cached accessories:', this.matterAccessories.size)
    this.log.info('='.repeat(80))
    this.log.info('Registering Matter accessories...')

    // Register each device type
    this.registerLightingDevices()
    this.registerSwitchesAndOutlets()
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
    const accessories: any[] = []
    accessories.push({
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
    accessories.push({
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
    accessories.push({
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
    accessories.push({
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
    accessories.push({
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

    // Register all lighting accessories
    this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
  }

  /**
   * Switches and Outlets
   */
  private registerSwitchesAndOutlets() {
    const uuidSwitch = this.api.matter.uuid.generate('matter-onoff-switch')
    const uuidOutlet = this.api.matter.uuid.generate('matter-onoff-outlet')
    const uuidDimmableOutlet = this.api.matter.uuid.generate('matter-dimmable-outlet')

    const accessories: any[] = []

    // 1. On/Off Switch
    accessories.push({
      uuid: uuidSwitch,
      displayName: 'On/Off Switch',
      deviceType: this.api.matter.deviceTypes.OnOffSwitch,
      serialNumber: 'SWITCH-001',
      manufacturer: 'Matter Examples',
      model: 'OnOffSwitch v1',

      clusters: {
        onOff: {
          onOff: false,
        },
      },

      handlers: {
        onOff: {
          on: async () => {
            this.log.info('[On/Off Switch] ✓ Handler `on` called (user controlled via Home app)')
          },
          off: async () => {
            this.log.info('[On/Off Switch] ✓ Handler `off` called (user controlled via Home app)')
          },
        },
      },
    })

    // 2. On/Off Outlet (Smart Plug)
    accessories.push({
      uuid: uuidOutlet,
      displayName: 'On/Off Outlet',
      deviceType: this.api.matter.deviceTypes.OnOffOutlet,
      serialNumber: 'OUTLET-001',
      manufacturer: 'Matter Examples',
      model: 'OnOffOutlet v1',

      clusters: {
        onOff: {
          onOff: false,
        },
      },

      handlers: {
        onOff: {
          on: async () => {
            this.log.info('[On/Off Outlet] ✓ Handler `on` called (user controlled via Home app)')
          },
          off: async () => {
            this.log.info('[On/Off Outlet] ✓ Handler `off` called (user controlled via Home app)')
          },
        },
      },
    })

    // 3. Dimmable Outlet
    accessories.push({
      uuid: uuidDimmableOutlet,
      displayName: 'Dimmable Outlet',
      deviceType: this.api.matter.deviceTypes.DimmableOutlet,
      serialNumber: 'OUTLET-002',
      manufacturer: 'Matter Examples',
      model: 'DimmableOutlet v1',

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

      handlers: {
        onOff: {
          on: async () => {
            this.log.info('[Dimmable Outlet] ✓ Handler `on` called (user controlled via Home app)')
          },
          off: async () => {
            this.log.info('[Dimmable Outlet] ✓ Handler `off` called (user controlled via Home app)')
          },
        },
        levelControl: {
          moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
            const { level } = request
            this.log.info(`[Dimmable Outlet] ✓ Handler \`moveToLevel\` called with ${level} (${Math.round(level / 254 * 100)}%)`)
          },
        },
      },
    })

    // Register all switch/outlet accessories
    this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)

    // Register sensor devices
    this.registerSensors()
  }

  /**
   * Register Matter sensor accessories
   */
  private registerSensors() {
    this.log.info('═'.repeat(80))
    this.log.info('Registering Matter Sensor Devices')
    this.log.info('═'.repeat(80))

    const accessories: any[] = []

    // 1. Temperature Sensor
    accessories.push({
      uuid: this.api.hap.uuid.generate('matter-temperature-sensor'),
      displayName: 'Temperature Sensor',
      deviceType: this.api.matter.deviceTypes.TemperatureSensor,
      serialNumber: 'TEMP-001',
      manufacturer: 'Homebridge',
      model: 'Temperature Sensor Example',
      clusters: {
        temperatureMeasurement: {
          measuredValue: 2100, // 21.00°C (in hundredths of a degree Celsius)
          minMeasuredValue: -5000, // -50°C
          maxMeasuredValue: 10000, // 100°C
        },
      },
    })

    // 2. Humidity Sensor
    accessories.push({
      uuid: this.api.hap.uuid.generate('matter-humidity-sensor'),
      displayName: 'Humidity Sensor',
      deviceType: this.api.matter.deviceTypes.HumiditySensor,
      serialNumber: 'HUM-001',
      manufacturer: 'Homebridge',
      model: 'Humidity Sensor Example',
      clusters: {
        relativeHumidityMeasurement: {
          measuredValue: 5500, // 55% (in hundredths of a percent)
          minMeasuredValue: 0,
          maxMeasuredValue: 10000, // 100%
        },
      },
    })

    // 3. Light Sensor
    accessories.push({
      uuid: this.api.hap.uuid.generate('matter-light-sensor'),
      displayName: 'Light Sensor',
      deviceType: this.api.matter.deviceTypes.LightSensor,
      serialNumber: 'LIGHT-001',
      manufacturer: 'Homebridge',
      model: 'Light Sensor Example',
      clusters: {
        illuminanceMeasurement: {
          measuredValue: 5000, // 500 lux (in 10,000 * log10(lux) format)
          minMeasuredValue: 1,
          maxMeasuredValue: 65534,
        },
      },
    })

    // 4. Motion Sensor (Occupancy)
    // Note: OccupancySensorDevice requires specifying features (PIR, Ultrasonic, or PhysicalContact)
    const OccupancySensingServer = this.api.matter.deviceTypes.MotionSensor.requirements.OccupancySensingServer
    const MotionSensorWithPIR = this.api.matter.deviceTypes.MotionSensor.with(
      OccupancySensingServer.with('PassiveInfrared'),
    )

    accessories.push({
      uuid: this.api.hap.uuid.generate('matter-motion-sensor'),
      displayName: 'Motion Sensor',
      deviceType: MotionSensorWithPIR,
      serialNumber: 'MOTION-001',
      manufacturer: 'Homebridge',
      model: 'Motion Sensor Example',
      clusters: {
        occupancySensing: {
          occupancy: {
            occupied: false, // No motion detected
          },
        },
      },
    })

    // 5. Contact Sensor
    accessories.push({
      uuid: this.api.hap.uuid.generate('matter-contact-sensor'),
      displayName: 'Contact Sensor',
      deviceType: this.api.matter.deviceTypes.ContactSensor,
      serialNumber: 'CONTACT-001',
      manufacturer: 'Homebridge',
      model: 'Contact Sensor Example',
      clusters: {
        booleanState: {
          stateValue: false, // Contact closed (false = closed, true = open)
        },
      },
    })

    // 6. Leak Sensor
    accessories.push({
      uuid: this.api.hap.uuid.generate('matter-leak-sensor'),
      displayName: 'Leak Sensor',
      deviceType: this.api.matter.deviceTypes.LeakSensor,
      serialNumber: 'LEAK-001',
      manufacturer: 'Homebridge',
      model: 'Leak Sensor Example',
      clusters: {
        booleanState: {
          stateValue: false, // No leak detected (false = dry, true = leak)
        },
      },
    })

    // 7. Smoke Sensor
    // Note: SmokeCoAlarmDevice requires specifying features (SmokeAlarm and/or CoAlarm)
    const SmokeCoAlarmServer = this.api.matter.deviceTypes.SmokeSensor.requirements.SmokeCoAlarmServer
    const SmokeSensorWithBoth = this.api.matter.deviceTypes.SmokeSensor.with(
      SmokeCoAlarmServer.with('SmokeAlarm', 'CoAlarm'),
    )

    accessories.push({
      uuid: this.api.hap.uuid.generate('matter-smoke-sensor'),
      displayName: 'Smoke Sensor',
      deviceType: SmokeSensorWithBoth,
      serialNumber: 'SMOKE-001',
      manufacturer: 'Homebridge',
      model: 'Smoke Sensor Example',
      clusters: {
        smokeCoAlarm: {
          smokeState: 0, // 0 = Normal, 1 = Warning, 2 = Critical
          coState: 0, // 0 = Normal, 1 = Warning, 2 = Critical
          batteryAlert: 0, // 0 = Normal
          testInProgress: false,
          hardwareFaultAlert: false,
          endOfServiceAlert: 0, // 0 = Normal
          interconnectSmokeAlarm: 0, // 0 = Normal
          interconnectCoAlarm: 0, // 0 = Normal
        },
      },
    })

    this.log.info(`✓ Registered ${accessories.length} sensor accessories`)
    for (const acc of accessories) {
      this.log.info(`  - ${acc.displayName}`)
    }

    // Register all sensor accessories
    this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
  }
}
