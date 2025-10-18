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

    // Remove disabled accessories that are cached
    this.removeDisabledAccessories()

    // Register each device type
    this.registerLightingDevices()
    this.registerSwitchesAndOutlets()
    this.registerSensors()
    this.registerHVAC()
    this.registerSecurity()
    this.registerWindowCoverings()
    this.registerAppliances()

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
   * Remove disabled accessories from cache
   */
  private removeDisabledAccessories() {
    const accessoriesToRemove = []

    // Define mapping of config flags to UUIDs
    const configMap = [
      { enabled: this.config.enableOnOffLight, uuid: this.api.matter.uuid.generate('matter-onoff-light'), name: 'On/Off Light' },
      { enabled: this.config.enableDimmableLight, uuid: this.api.matter.uuid.generate('matter-dimmable-light'), name: 'Dimmable Light' },
      { enabled: this.config.enableColourTemperatureLight, uuid: this.api.matter.uuid.generate('matter-colour-temp-light'), name: 'Colour Temperature Light' },
      { enabled: this.config.enableColourLight, uuid: this.api.matter.uuid.generate('matter-colour-light'), name: 'Colour Light' },
      { enabled: this.config.enableExtendedColourLight, uuid: this.api.matter.uuid.generate('matter-extended-colour-light'), name: 'Extended Colour Light' },
      { enabled: this.config.enableOnOffSwitch, uuid: this.api.matter.uuid.generate('matter-onoff-switch'), name: 'On/Off Switch' },
      { enabled: this.config.enableOnOffOutlet, uuid: this.api.matter.uuid.generate('matter-onoff-outlet'), name: 'On/Off Outlet' },
      { enabled: this.config.enableDimmableOutlet, uuid: this.api.matter.uuid.generate('matter-dimmable-outlet'), name: 'Dimmable Outlet' },
      { enabled: this.config.enableTemperatureSensor, uuid: this.api.hap.uuid.generate('matter-temperature-sensor'), name: 'Temperature Sensor' },
      { enabled: this.config.enableHumiditySensor, uuid: this.api.hap.uuid.generate('matter-humidity-sensor'), name: 'Humidity Sensor' },
      { enabled: this.config.enableLightSensor, uuid: this.api.hap.uuid.generate('matter-light-sensor'), name: 'Light Sensor' },
      { enabled: this.config.enableMotionSensor, uuid: this.api.hap.uuid.generate('matter-motion-sensor'), name: 'Motion Sensor' },
      { enabled: this.config.enableContactSensor, uuid: this.api.hap.uuid.generate('matter-contact-sensor'), name: 'Contact Sensor' },
      { enabled: this.config.enableLeakSensor, uuid: this.api.hap.uuid.generate('matter-leak-sensor'), name: 'Leak Sensor' },
      { enabled: this.config.enableSmokeSensor, uuid: this.api.hap.uuid.generate('matter-smoke-sensor'), name: 'Smoke Sensor' },
      { enabled: this.config.enableThermostat, uuid: this.api.matter.uuid.generate('matter-thermostat'), name: 'Thermostat' },
      { enabled: this.config.enableFan, uuid: this.api.matter.uuid.generate('matter-fan'), name: 'Fan' },
      { enabled: this.config.enableDoorLock, uuid: this.api.matter.uuid.generate('matter-door-lock'), name: 'Door Lock' },
      { enabled: this.config.enableGarageDoor, uuid: this.api.matter.uuid.generate('matter-garage-door'), name: 'Garage Door' },
      { enabled: this.config.enableWindowBlind, uuid: this.api.matter.uuid.generate('matter-window-blind'), name: 'Window Blind' },
      { enabled: this.config.enableVenetianBlind, uuid: this.api.matter.uuid.generate('matter-venetian-blind'), name: 'Venetian Blind' },
      { enabled: this.config.enableRobotVacuum, uuid: this.api.matter.uuid.generate('matter-robot-vacuum'), name: 'Robot Vacuum' },
    ]

    // Check each config entry
    for (const item of configMap) {
      // If disabled and exists in cache, mark for removal
      if (!item.enabled && this.matterAccessories.has(item.uuid)) {
        accessoriesToRemove.push(item)
      }
    }

    // Remove disabled accessories
    if (accessoriesToRemove.length > 0) {
      this.log.info(`Removing ${accessoriesToRemove.length} disabled accessories...`)
      for (const item of accessoriesToRemove) {
        this.log.info(`  - Removing: ${item.name}`)
        this.api.matter.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.matterAccessories.get(item.uuid)])
        this.matterAccessories.delete(item.uuid)
      }
    }
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

    if (this.config.enableOnOffLight) {
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
    }

    // 2. Dimmable Light
    if (this.config.enableDimmableLight) {
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
    }

    // 3. Colour Temperature Light
    if (this.config.enableColourTemperatureLight) {
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
    }

    // 4. Colour Light (Hue/Saturation ONLY - no CCT)
    if (this.config.enableColourLight) {
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
    }

    // 5. Extended Colour Light (Hue/Saturation + CCT)
    if (this.config.enableExtendedColourLight) {
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
    }

    // Register all lighting accessories
    if (accessories.length > 0) {
      this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
    }
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
    if (this.config.enableOnOffSwitch) {
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
    }

    // 2. On/Off Outlet (Smart Plug)
    if (this.config.enableOnOffOutlet) {
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
    }

    // 3. Dimmable Outlet
    if (this.config.enableDimmableOutlet) {
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
    }

    // Register all switch/outlet accessories
    if (accessories.length > 0) {
      this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
    }
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
    if (this.config.enableTemperatureSensor) {
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
    }

    // 2. Humidity Sensor
    if (this.config.enableHumiditySensor) {
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
    }

    // 3. Light Sensor
    if (this.config.enableLightSensor) {
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
    }

    // 4. Motion Sensor (Occupancy)
    if (this.config.enableMotionSensor) {
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
    }

    // 5. Contact Sensor
    if (this.config.enableContactSensor) {
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
    }

    // 6. Leak Sensor
    if (this.config.enableLeakSensor) {
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
    }

    // 7. Smoke Sensor
    if (this.config.enableSmokeSensor) {
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
    }

    if (accessories.length > 0) {
      this.log.info(`✓ Registered ${accessories.length} sensor accessories`)
      for (const acc of accessories) {
        this.log.info(`  - ${acc.displayName}`)
      }

      // Register all sensor accessories
      this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
    }
  }

  /**
   * Register Matter HVAC accessories (Thermostats, Fans)
   */
  private registerHVAC() {
    this.log.info('═'.repeat(80))
    this.log.info('Registering Matter HVAC Devices')
    this.log.info('═'.repeat(80))

    const accessories: any[] = []

    // 1. Thermostat
    if (this.config.enableThermostat) {
      accessories.push({
        uuid: this.api.matter.uuid.generate('matter-thermostat'),
        displayName: 'Thermostat',
        deviceType: this.api.matter.deviceTypes.Thermostat,
        serialNumber: 'THERMO-001',
        manufacturer: 'Matter Examples',
        model: 'Thermostat v1',

        clusters: {
          thermostat: {
          // Current temperature (in hundredths of degrees Celsius)
            localTemperature: 2100, // 21.00°C

            // Heating setpoint (target temperature in heat mode)
            occupiedHeatingSetpoint: 2000, // 20.00°C
            minHeatSetpointLimit: 700, // 7°C minimum
            maxHeatSetpointLimit: 3000, // 30°C maximum

            // Cooling setpoint (target temperature in cool mode)
            occupiedCoolingSetpoint: 2400, // 24.00°C
            minCoolSetpointLimit: 1600, // 16°C minimum
            maxCoolSetpointLimit: 3200, // 32°C maximum

            // System mode: 0=Off, 1=Auto, 3=Cool, 4=Heat
            systemMode: 4, // Heat mode

            // Control sequence: what modes are available (mandatory field)
            // 4 = CoolingAndHeating (correct value when both Heating & Cooling features are present)
            controlSequenceOfOperation: 4,
          },
        },

        handlers: {
          thermostat: {
          // Called when user changes heating setpoint
            setOccupiedHeatingSetpoint: async (request: { targetSetpoint: number }) => {
              const tempC = (request.targetSetpoint / 100).toFixed(1)
              this.log.info(`[Thermostat] ✓ Handler \`setOccupiedHeatingSetpoint\` called: ${request.targetSetpoint} (${tempC}°C)`)
            },

            // Called when user changes cooling setpoint
            setOccupiedCoolingSetpoint: async (request: { targetSetpoint: number }) => {
              const tempC = (request.targetSetpoint / 100).toFixed(1)
              this.log.info(`[Thermostat] ✓ Handler \`setOccupiedCoolingSetpoint\` called: ${request.targetSetpoint} (${tempC}°C)`)
            },

            // Called when user changes mode (Off, Auto, Cool, Heat)
            setSystemMode: async (request: { systemMode: number }) => {
              const modes = ['Off', 'Auto', 'Reserved', 'Cool', 'Heat', 'Emergency Heating', 'Precooling', 'Fan Only']
              const modeName = modes[request.systemMode] || `Unknown (${request.systemMode})`
              this.log.info(`[Thermostat] ✓ Handler \`setSystemMode\` called: ${request.systemMode} (${modeName})`)
            },
          },
        },
      })
    }

    // 2. Fan
    if (this.config.enableFan) {
      accessories.push({
        uuid: this.api.matter.uuid.generate('matter-fan'),
        displayName: 'Fan',
        deviceType: this.api.matter.deviceTypes.Fan,
        serialNumber: 'FAN-001',
        manufacturer: 'Matter Examples',
        model: 'Fan v1',

        clusters: {
          fanControl: {
          // Fan mode: 0=Off, 1=Low, 2=Medium, 3=High, 4=On, 5=Auto, 6=Smart
            fanMode: 0, // Off

            // Fan mode sequence: indicates which modes are supported
            // 0=OffLowMedHigh, 1=OffLowHigh, 2=OffLowMedHighAuto, 3=OffLowHighAuto, 4=OffOnAuto, 5=OffOn
            fanModeSequence: 0, // OffLowMedHigh

            // Percent setting (0-100)
            percentSetting: 0,
            percentCurrent: 0,

            // Speed setting (0-100, some fans use this instead of percent)
            speedSetting: 0,
            speedCurrent: 0,
          },
        },

        handlers: {
          fanControl: {
          // Called when user changes fan speed via percent slider
            setPercentSetting: async (request: { percentSetting: number }) => {
              this.log.info(`[Fan] ✓ Handler \`setPercentSetting\` called: ${request.percentSetting}%`)
            },

            // Called when user changes fan mode
            setFanMode: async (request: { fanMode: number }) => {
              const modes = ['Off', 'Low', 'Medium', 'High', 'On', 'Auto', 'Smart']
              const modeName = modes[request.fanMode] || `Unknown (${request.fanMode})`
              this.log.info(`[Fan] ✓ Handler \`setFanMode\` called: ${request.fanMode} (${modeName})`)
            },

            // Called when user presses up/down buttons to adjust speed
            step: async (request: { direction: number, wrap: boolean, lowestOff: boolean }) => {
              const dir = request.direction === 0 ? 'Up' : 'Down'
              this.log.info(`[Fan] ✓ Handler \`step\` called: direction=${dir}, wrap=${request.wrap}, lowestOff=${request.lowestOff}`)
            },
          },
        },
      })
    }

    if (accessories.length > 0) {
      this.log.info(`✓ Registered ${accessories.length} HVAC accessories`)
      for (const acc of accessories) {
        this.log.info(`  - ${acc.displayName}`)
      }

      // Register all HVAC accessories
      this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
    }
  }

  /**
   * Register Matter Security & Access accessories (Door Locks, Garage Doors)
   */
  private registerSecurity() {
    this.log.info('═'.repeat(80))
    this.log.info('Registering Matter Security & Access Devices')
    this.log.info('═'.repeat(80))

    const accessories: any[] = []

    // 1. Door Lock
    if (this.config.enableDoorLock) {
      accessories.push({
        uuid: this.api.matter.uuid.generate('matter-door-lock'),
        displayName: 'Door Lock',
        deviceType: this.api.matter.deviceTypes.DoorLock,
        serialNumber: 'LOCK-001',
        manufacturer: 'Matter Examples',
        model: 'DoorLock v1',

        clusters: {
          doorLock: {
          // Lock state: 0=NotFullyLocked, 1=Locked, 2=Unlocked
            lockState: 2, // Unlocked

            // Lock type: 0=Deadbolt, 1=Magnetic, 2=Other, etc.
            lockType: 0, // Deadbolt

            // Actuator enabled (can be locked/unlocked)
            actuatorEnabled: true,
          },
        },

        handlers: {
          doorLock: {
          // Called when user locks the door
            lockDoor: async () => {
              this.log.info('[Door Lock] ✓ Handler `lockDoor` called - Locking door')

              // Update the lock state to "Locked" (1)
              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-door-lock'),
                'doorLock',
                { lockState: 1 },
              )
            },

            // Called when user unlocks the door
            unlockDoor: async () => {
              this.log.info('[Door Lock] ✓ Handler `unlockDoor` called - Unlocking door')

              // Update the lock state to "Unlocked" (2)
              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-door-lock'),
                'doorLock',
                { lockState: 2 },
              )
            },
          },
        },
      })
    }

    // 2. Garage Door Opener
    if (this.config.enableGarageDoor) {
      // Note: Matter uses WindowCovering device type for garage doors
      accessories.push({
        uuid: this.api.matter.uuid.generate('matter-garage-door'),
        displayName: 'Garage Door',
        deviceType: this.api.matter.deviceTypes.WindowCovering,
        serialNumber: 'GARAGE-001',
        manufacturer: 'Matter Examples',
        model: 'GarageDoor v1',

        clusters: {
          windowCovering: {
          // Target position (0 = fully closed, 10000 = fully open)
            targetPositionLiftPercent100ths: 0, // Closed

            // Current position
            currentPositionLiftPercent100ths: 0, // Closed

            // Operational status
            operationalStatus: {
              global: 0, // Not moving
              lift: 0,
              tilt: 0,
            },

            // End product type
            endProductType: 7, // Garage door

            // Configuration: supports lift positioning
            configStatus: {
              operational: true,
              onlineReserved: true,
              liftMovementReversed: false,
              liftPositionAware: true,
              tiltPositionAware: false,
              liftEncoderControlled: true,
              tiltEncoderControlled: false,
            },
          },
        },

        handlers: {
          windowCovering: {
          // Called when user opens/closes garage door
            goToLiftPercentage: async (request: { targetPercent: number }) => {
              const percent = (request.targetPercent / 100).toFixed(0)
              this.log.info(`[Garage Door] ✓ Handler \`goToLiftPercentage\` called: ${request.targetPercent} (${percent}% open)`)

              // Update position
              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-garage-door'),
                'windowCovering',
                {
                  currentPositionLiftPercent100ths: request.targetPercent,
                  targetPositionLiftPercent100ths: request.targetPercent,
                },
              )
            },

            // Called when user presses "up" (open)
            upOrOpen: async () => {
              this.log.info('[Garage Door] ✓ Handler `upOrOpen` called - Opening garage door')

              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-garage-door'),
                'windowCovering',
                {
                  currentPositionLiftPercent100ths: 10000, // Fully open
                  targetPositionLiftPercent100ths: 10000,
                },
              )
            },

            // Called when user presses "down" (close)
            downOrClose: async () => {
              this.log.info('[Garage Door] ✓ Handler `downOrClose` called - Closing garage door')

              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-garage-door'),
                'windowCovering',
                {
                  currentPositionLiftPercent100ths: 0, // Fully closed
                  targetPositionLiftPercent100ths: 0,
                },
              )
            },

            // Called when user presses "stop"
            stopMotion: async () => {
              this.log.info('[Garage Door] ✓ Handler `stopMotion` called - Stopping garage door')
            },
          },
        },
      })
    }

    if (accessories.length > 0) {
      this.log.info(`✓ Registered ${accessories.length} security & access accessories`)
      for (const acc of accessories) {
        this.log.info(`  - ${acc.displayName}`)
      }

      // Register all security accessories
      this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
    }
  }

  /**
   * Register Matter Window Covering accessories (Blinds, Shades)
   */
  private registerWindowCoverings() {
    this.log.info('═'.repeat(80))
    this.log.info('Registering Matter Window Covering Devices')
    this.log.info('═'.repeat(80))

    const accessories: any[] = []

    // 1. Window Covering (Blind/Shade with position control)
    if (this.config.enableWindowBlind) {
      accessories.push({
        uuid: this.api.matter.uuid.generate('matter-window-blind'),
        displayName: 'Window Blind',
        deviceType: this.api.matter.deviceTypes.WindowCovering,
        serialNumber: 'BLIND-001',
        manufacturer: 'Matter Examples',
        model: 'WindowBlind v1',

        clusters: {
          windowCovering: {
          // Target position (0 = fully closed, 10000 = fully open, in hundredths of percent)
            targetPositionLiftPercent100ths: 5000, // 50% open

            // Current position
            currentPositionLiftPercent100ths: 5000, // 50% open

            // Operational status
            operationalStatus: {
              global: 0, // Not moving
              lift: 0,
              tilt: 0,
            },

            // End product type
            endProductType: 0, // Rollershade

            // Configuration
            configStatus: {
              operational: true,
              onlineReserved: true,
              liftMovementReversed: false,
              liftPositionAware: true,
              tiltPositionAware: false,
              liftEncoderControlled: true,
              tiltEncoderControlled: false,
            },
          },
        },

        handlers: {
          windowCovering: {
          // Called when user sets position via slider
            goToLiftPercentage: async (request: { targetPercent: number }) => {
              const percent = (request.targetPercent / 100).toFixed(0)
              this.log.info(`[Window Blind] ✓ Handler \`goToLiftPercentage\` called: ${request.targetPercent} (${percent}% open)`)

              // Update position
              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-window-blind'),
                'windowCovering',
                {
                  currentPositionLiftPercent100ths: request.targetPercent,
                  targetPositionLiftPercent100ths: request.targetPercent,
                },
              )
            },

            // Called when user presses "up" (open)
            upOrOpen: async () => {
              this.log.info('[Window Blind] ✓ Handler `upOrOpen` called - Opening blind')

              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-window-blind'),
                'windowCovering',
                {
                  currentPositionLiftPercent100ths: 10000, // Fully open
                  targetPositionLiftPercent100ths: 10000,
                },
              )
            },

            // Called when user presses "down" (close)
            downOrClose: async () => {
              this.log.info('[Window Blind] ✓ Handler `downOrClose` called - Closing blind')

              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-window-blind'),
                'windowCovering',
                {
                  currentPositionLiftPercent100ths: 0, // Fully closed
                  targetPositionLiftPercent100ths: 0,
                },
              )
            },

            // Called when user presses "stop"
            stopMotion: async () => {
              this.log.info('[Window Blind] ✓ Handler `stopMotion` called - Stopping blind')
            },
          },
        },
      })
    }

    // 2. Window Covering with Tilt (Venetian Blind)
    if (this.config.enableVenetianBlind) {
      accessories.push({
        uuid: this.api.matter.uuid.generate('matter-venetian-blind'),
        displayName: 'Venetian Blind (Tilt)',
        deviceType: this.api.matter.deviceTypes.WindowCovering,
        serialNumber: 'BLIND-002',
        manufacturer: 'Matter Examples',
        model: 'VenetianBlind v1',

        clusters: {
          windowCovering: {
          // Lift position (vertical position)
            targetPositionLiftPercent100ths: 5000, // 50% open
            currentPositionLiftPercent100ths: 5000,

            // Tilt position (slat angle: 0 = closed, 10000 = fully open)
            targetPositionTiltPercent100ths: 5000, // 50% tilted
            currentPositionTiltPercent100ths: 5000,

            // Operational status
            operationalStatus: {
              global: 0,
              lift: 0,
              tilt: 0,
            },

            // End product type
            endProductType: 8, // Venetian blind

            // Configuration: supports both lift and tilt
            configStatus: {
              operational: true,
              onlineReserved: true,
              liftMovementReversed: false,
              liftPositionAware: true,
              tiltPositionAware: true,
              liftEncoderControlled: true,
              tiltEncoderControlled: true,
            },
          },
        },

        handlers: {
          windowCovering: {
          // Called when user sets lift position
            goToLiftPercentage: async (request: { targetPercent: number }) => {
              const percent = (request.targetPercent / 100).toFixed(0)
              this.log.info(`[Venetian Blind] ✓ Handler \`goToLiftPercentage\` called: ${request.targetPercent} (${percent}% open)`)

              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-venetian-blind'),
                'windowCovering',
                {
                  currentPositionLiftPercent100ths: request.targetPercent,
                  targetPositionLiftPercent100ths: request.targetPercent,
                },
              )
            },

            // Called when user sets tilt angle
            goToTiltPercentage: async (request: { targetPercent: number }) => {
              const percent = (request.targetPercent / 100).toFixed(0)
              this.log.info(`[Venetian Blind] ✓ Handler \`goToTiltPercentage\` called: ${request.targetPercent} (${percent}% tilted)`)

              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-venetian-blind'),
                'windowCovering',
                {
                  currentPositionTiltPercent100ths: request.targetPercent,
                  targetPositionTiltPercent100ths: request.targetPercent,
                },
              )
            },

            upOrOpen: async () => {
              this.log.info('[Venetian Blind] ✓ Handler `upOrOpen` called')
            },

            downOrClose: async () => {
              this.log.info('[Venetian Blind] ✓ Handler `downOrClose` called')
            },

            stopMotion: async () => {
              this.log.info('[Venetian Blind] ✓ Handler `stopMotion` called')
            },
          },
        },
      })
    }

    if (accessories.length > 0) {
      this.log.info(`✓ Registered ${accessories.length} window covering accessories`)
      for (const acc of accessories) {
        this.log.info(`  - ${acc.displayName}`)
      }

      // Register all window covering accessories
      this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
    }
  }

  /**
   * Register Matter Appliance accessories (Robotic Vacuum Cleaners, etc.)
   */
  private registerAppliances() {
    this.log.info('═'.repeat(80))
    this.log.info('Registering Matter Appliance Devices')
    this.log.info('═'.repeat(80))

    const accessories: any[] = []

    // 1. Robotic Vacuum Cleaner
    if (this.config.enableRobotVacuum) {
      accessories.push({
        uuid: this.api.matter.uuid.generate('matter-robot-vacuum'),
        displayName: 'Robot Vacuum',
        deviceType: this.api.matter.deviceTypes.RoboticVacuumCleaner,
        serialNumber: 'VACUUM-001',
        manufacturer: 'Matter Examples',
        model: 'RobotVacuum v1',

        clusters: {
          rvcRunMode: {
          // Supported run modes (0=Idle, 1=Cleaning, 2=Mapping)
            supportedModes: [
              { label: 'Idle', mode: 0, modeTags: [{ value: 16384 }] }, // 16384 = Idle tag
              { label: 'Cleaning', mode: 1, modeTags: [{ value: 16385 }] }, // 16385 = Cleaning tag
              { label: 'Mapping', mode: 2, modeTags: [{ value: 16386 }] }, // 16386 = Mapping tag
            ],
            // Current mode
            currentMode: 0, // Idle
          },

          rvcOperationalState: {
          // Operational state list (must include at least an error state)
            operationalStateList: [
              { operationalStateId: 0 }, // Stopped
              { operationalStateId: 1 }, // Running
              { operationalStateId: 2 }, // Paused
              { operationalStateId: 3 }, // Error (required)
              { operationalStateId: 64 }, // SeekingCharger
              { operationalStateId: 65 }, // Charging
              { operationalStateId: 66 }, // Docked
            ],

            // Current operational state (just the ID, not an object)
            operationalState: 66, // Docked

            // Error state
            operationalError: {
              errorStateId: 0, // No error
            },
          },

          rvcCleanMode: {
          // Supported clean modes (0=Vacuum, 1=Mop, 2=Vacuum+Mop)
            supportedModes: [
              { label: 'Vacuum', mode: 0, modeTags: [] },
              { label: 'Mop', mode: 1, modeTags: [] },
              { label: 'Vacuum & Mop', mode: 2, modeTags: [] },
            ],
            // Current clean mode
            currentMode: 0, // Vacuum
          },
        },

        handlers: {
          rvcOperationalState: {
          // Called when user presses "pause" in Home app
            pause: async () => {
              this.log.info('[Robot Vacuum] ✓ Handler `pause` called - Pausing cleaning')

              // Update state to Paused (2)
              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-robot-vacuum'),
                'rvcOperationalState',
                { operationalState: 2 }, // Paused
              )
            },

            // Called when user presses "resume" or "start" in Home app
            resume: async () => {
              this.log.info('[Robot Vacuum] ✓ Handler `resume` called - Resuming cleaning')

              // Update state to Running (1)
              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-robot-vacuum'),
                'rvcOperationalState',
                { operationalState: 1 }, // Running
              )
            },

            // Called when user sends robot to charging dock
            goHome: async () => {
              this.log.info('[Robot Vacuum] ✓ Handler `goHome` called - Returning to dock')

              // Update state to SeekingCharger (64)
              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-robot-vacuum'),
                'rvcOperationalState',
                { operationalState: 64 }, // SeekingCharger
              )

              // Simulate arriving at dock after 3 seconds
              setTimeout(async () => {
                this.log.info('[Robot Vacuum] → Arrived at dock, now docked')
                await this.api.matter.updateAccessoryState(
                  this.api.matter.uuid.generate('matter-robot-vacuum'),
                  'rvcOperationalState',
                  { operationalState: 66 }, // Docked
                )
              }, 3000)
            },
          },

          rvcRunMode: {
          // Called when user changes run mode (Idle, Cleaning, Mapping)
            changeToMode: async (request: { newMode: number }) => {
              const modes = ['Idle', 'Cleaning', 'Mapping']
              const modeName = modes[request.newMode] || `Unknown (${request.newMode})`
              this.log.info(`[Robot Vacuum] ✓ Handler \`changeToMode\` called: ${request.newMode} (${modeName})`)

              // Update the current mode
              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-robot-vacuum'),
                'rvcRunMode',
                { currentMode: request.newMode },
              )
            },
          },

          rvcCleanMode: {
          // Called when user changes clean mode (Vacuum, Mop, Vacuum+Mop)
            changeToMode: async (request: { newMode: number }) => {
              const modes = ['Vacuum', 'Mop', 'Vacuum & Mop']
              const modeName = modes[request.newMode] || `Unknown (${request.newMode})`
              this.log.info(`[Robot Vacuum] ✓ Handler \`changeToMode\` called: ${request.newMode} (${modeName})`)

              // Update the current clean mode
              await this.api.matter.updateAccessoryState(
                this.api.matter.uuid.generate('matter-robot-vacuum'),
                'rvcCleanMode',
                { currentMode: request.newMode },
              )
            },
          },
        },
      })
    }

    if (accessories.length > 0) {
      this.log.info(`✓ Registered ${accessories.length} appliance accessories`)
      for (const acc of accessories) {
        this.log.info(`  - ${acc.displayName}`)
      }

      // Register all appliance accessories
      this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
    }
  }
}
