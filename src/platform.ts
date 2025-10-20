import type {
  API,
  DynamicPlatformPlugin,
  Logging,
  PlatformConfig,
} from 'homebridge'

import {
  registerColorTemperatureLight,
  registerContactSensor,
  registerDimmableLight,
  registerDimmablePlugInUnit,
  registerDoorLock,
  registerExtendedColorLight,
  registerFan,
  registerHumiditySensor,
  registerLightSensor,
  registerOccupancySensor,
  registerOnOffLight,
  registerOnOffLightSwitch,
  registerOnOffPlugInUnit,
  registerRoboticVacuumCleaner,
  registerSmokeCoAlarm,
  registerTemperatureSensor,
  registerThermostat,
  registerWaterLeakDetector,
  registerWindowCovering,
} from './devices/index.js'
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js'

/**
 * MatterPlatform
 * Demonstrates all available Matter device types in Homebridge
 *
 * Organized by official Matter Specification v1.4.1 categories
 */
export class ExampleHomebridgePlatform implements DynamicPlatformPlugin {
  // Track restored HAP cached accessories (required for DynamicPlatformPlugin)
  // This is commented out here as this plugin does not have any HAP accessories
  // public readonly accessories: Map<string, PlatformAccessory> = new Map()

  // Track restored Matter cached accessories
  public readonly matterAccessories: Map<string, any> = new Map()

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name)

    // Does the user have a version of Homebridge that is compatible with matter?
    if (!this.api.isMatterAvailable?.()) {
      this.log.warn('Matter is not available in this version of Homebridge. Please update Homebridge to use this plugin.')
    }

    // Check if the user has matter enabled, this means:
    // - If the plugin is running on the main bridge, then the user must have enabled matter in the Homebridge settings page in the UI
    // - If the plugin is running on a child bridge, then the user must have enabled matter on the plugin bridge settings section in the UI
    // In reality, only the below check is needed, but they are both included here for completeness
    // Remember to use a '?.' optional chaining operator in case the user is running an older version of Homebridge that does not have these APIs
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
    // Note this is not used for Matter accessories - use configureMatterAccessory instead
    // This plugin does not have any hap accessories, so here we can comment this out
    // this.accessories.set(accessory.UUID, accessory)
  }

  /**
   * Called when homebridge restores cached Matter accessories from disk at startup
   */
  configureMatterAccessory(accessory: any) {
    this.log.debug('Loading cached Matter accessory:', accessory.displayName)
    this.matterAccessories.set(accessory.uuid, accessory)
  }

  /**
   * Register all Matter accessories
   */
  private registerMatterAccessories() {
    this.log.info('═'.repeat(80))
    this.log.info('Homebridge Matter Plugin')
    this.log.info('═'.repeat(80))

    // Remove accessories that are disabled in config
    this.removeDisabledAccessories()

    // Register devices by Matter specification sections
    this.registerSection4Lighting()
    this.registerSection5SmartPlugs()
    this.registerSection6Switches()
    this.registerSection7Sensors()
    this.registerSection8Closure()
    this.registerSection9HVAC()
    this.registerSection12Robotic()

    this.log.info('═'.repeat(80))
    this.log.info('Finished registering Matter accessories')
    this.log.info('═'.repeat(80))
  }

  /**
   * Remove accessories that are disabled in config
   */
  private removeDisabledAccessories() {
    const configMap = [
      { enabled: this.config.enableOnOffLight, uuid: this.api.matter.uuid.generate('matter-onoff-light'), name: 'On/Off Light' },
      { enabled: this.config.enableDimmableLight, uuid: this.api.matter.uuid.generate('matter-dimmable-light'), name: 'Dimmable Light' },
      { enabled: this.config.enableColourTemperatureLight, uuid: this.api.matter.uuid.generate('matter-colour-temp-light'), name: 'Colour Temperature Light' },
      { enabled: this.config.enableColourLight, uuid: this.api.matter.uuid.generate('matter-colour-light'), name: 'Colour Light (HS)' },
      { enabled: this.config.enableExtendedColourLight, uuid: this.api.matter.uuid.generate('matter-extended-colour-light'), name: 'Extended Colour Light' },
      { enabled: this.config.enableOnOffOutlet, uuid: this.api.matter.uuid.generate('matter-onoff-outlet'), name: 'On/Off Outlet' },
      { enabled: this.config.enableDimmableOutlet, uuid: this.api.matter.uuid.generate('matter-dimmable-outlet'), name: 'Dimmable Outlet' },
      { enabled: this.config.enableOnOffSwitch, uuid: this.api.matter.uuid.generate('matter-onoff-switch'), name: 'On/Off Switch' },
      { enabled: this.config.enableTemperatureSensor, uuid: this.api.hap.uuid.generate('matter-temperature-sensor'), name: 'Temperature Sensor' },
      { enabled: this.config.enableHumiditySensor, uuid: this.api.hap.uuid.generate('matter-humidity-sensor'), name: 'Humidity Sensor' },
      { enabled: this.config.enableLightSensor, uuid: this.api.hap.uuid.generate('matter-light-sensor'), name: 'Light Sensor' },
      { enabled: this.config.enableMotionSensor, uuid: this.api.hap.uuid.generate('matter-motion-sensor'), name: 'Motion Sensor' },
      { enabled: this.config.enableContactSensor, uuid: this.api.hap.uuid.generate('matter-contact-sensor'), name: 'Contact Sensor' },
      { enabled: this.config.enableLeakSensor, uuid: this.api.hap.uuid.generate('matter-leak-sensor'), name: 'Leak Sensor' },
      { enabled: this.config.enableSmokeSensor, uuid: this.api.hap.uuid.generate('matter-smoke-sensor'), name: 'Smoke Sensor' },
      { enabled: this.config.enableDoorLock, uuid: this.api.matter.uuid.generate('matter-door-lock'), name: 'Door Lock' },
      { enabled: this.config.enableWindowBlind, uuid: this.api.matter.uuid.generate('matter-window-blind'), name: 'Window Blind' },
      { enabled: this.config.enableVenetianBlind, uuid: this.api.matter.uuid.generate('matter-venetian-blind'), name: 'Venetian Blind' },
      { enabled: this.config.enableThermostat, uuid: this.api.matter.uuid.generate('matter-thermostat'), name: 'Thermostat' },
      { enabled: this.config.enableFan, uuid: this.api.matter.uuid.generate('matter-fan'), name: 'Fan' },
      { enabled: this.config.enableRobotVacuum, uuid: this.api.matter.uuid.generate('matter-robot-vacuum'), name: 'Robot Vacuum' },
    ]

    for (const { enabled, uuid, name } of configMap) {
      if (enabled === false) {
        const existingAccessory = this.matterAccessories.get(uuid)
        if (existingAccessory) {
          this.log.info(`Removing accessory '${name}' (disabled in config)`)
          this.api.matter.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory])
          this.matterAccessories.delete(uuid)
        }
      }
    }
  }

  /**
   * Section 4: Lighting Devices (Matter Spec § 4)
   */
  private registerSection4Lighting() {
    this.log.info('═'.repeat(80))
    this.log.info('Section 4: Lighting Devices (Matter Spec § 4)')
    this.log.info('═'.repeat(80))

    const context = { api: this.api, log: this.log, config: this.config }
    const accessories = [
      ...registerOnOffLight(context),
      ...registerDimmableLight(context),
      ...registerColorTemperatureLight(context),
      ...registerExtendedColorLight(context),
    ]

    if (accessories.length > 0) {
      this.log.info(`✓ Registered ${accessories.length} lighting device(s)`)
      for (const acc of accessories) {
        this.log.info(`  - ${acc.displayName}`)
      }
      this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
    }
  }

  /**
   * Section 5: Smart Plugs/Actuators (Matter Spec § 5)
   */
  private registerSection5SmartPlugs() {
    this.log.info('═'.repeat(80))
    this.log.info('Section 5: Smart Plugs/Actuators (Matter Spec § 5)')
    this.log.info('═'.repeat(80))

    const context = { api: this.api, log: this.log, config: this.config }
    const accessories = [
      ...registerOnOffPlugInUnit(context),
      ...registerDimmablePlugInUnit(context),
    ]

    if (accessories.length > 0) {
      this.log.info(`✓ Registered ${accessories.length} smart plug/actuator device(s)`)
      for (const acc of accessories) {
        this.log.info(`  - ${acc.displayName}`)
      }
      this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
    }
  }

  /**
   * Section 6: Switches & Controllers (Matter Spec § 6)
   */
  private registerSection6Switches() {
    this.log.info('═'.repeat(80))
    this.log.info('Section 6: Switches & Controllers (Matter Spec § 6)')
    this.log.info('═'.repeat(80))

    const context = { api: this.api, log: this.log, config: this.config }
    const accessories = [
      ...registerOnOffLightSwitch(context),
    ]

    if (accessories.length > 0) {
      this.log.info(`✓ Registered ${accessories.length} switch/controller device(s)`)
      for (const acc of accessories) {
        this.log.info(`  - ${acc.displayName}`)
      }
      this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
    }
  }

  /**
   * Section 7: Sensors (Matter Spec § 7)
   */
  private registerSection7Sensors() {
    this.log.info('═'.repeat(80))
    this.log.info('Section 7: Sensors (Matter Spec § 7)')
    this.log.info('═'.repeat(80))

    const context = { api: this.api, log: this.log, config: this.config }
    const accessories = [
      ...registerContactSensor(context),
      ...registerLightSensor(context),
      ...registerOccupancySensor(context),
      ...registerTemperatureSensor(context),
      ...registerHumiditySensor(context),
      ...registerSmokeCoAlarm(context),
      ...registerWaterLeakDetector(context),
    ]

    if (accessories.length > 0) {
      this.log.info(`✓ Registered ${accessories.length} sensor device(s)`)
      for (const acc of accessories) {
        this.log.info(`  - ${acc.displayName}`)
      }
      this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
    }
  }

  /**
   * Section 8: Closure Devices (Matter Spec § 8)
   */
  private registerSection8Closure() {
    this.log.info('═'.repeat(80))
    this.log.info('Section 8: Closure Devices (Matter Spec § 8)')
    this.log.info('═'.repeat(80))

    const context = { api: this.api, log: this.log, config: this.config }
    const accessories = [
      ...registerDoorLock(context),
      ...registerWindowCovering(context),
    ]

    if (accessories.length > 0) {
      this.log.info(`✓ Registered ${accessories.length} closure device(s)`)
      for (const acc of accessories) {
        this.log.info(`  - ${acc.displayName}`)
      }
      this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
    }
  }

  /**
   * Section 9: HVAC (Matter Spec § 9)
   */
  private registerSection9HVAC() {
    this.log.info('═'.repeat(80))
    this.log.info('Section 9: HVAC (Matter Spec § 9)')
    this.log.info('═'.repeat(80))

    const context = { api: this.api, log: this.log, config: this.config }
    const accessories = [
      ...registerThermostat(context),
      ...registerFan(context),
    ]

    if (accessories.length > 0) {
      this.log.info(`✓ Registered ${accessories.length} HVAC device(s)`)
      for (const acc of accessories) {
        this.log.info(`  - ${acc.displayName}`)
      }
      this.api.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
    }
  }

  /**
   * Section 12: Robotic Devices (Matter Spec § 12)
   *
   * ⚠️ IMPORTANT: RVC devices are published as external accessories
   * Apple Home requires RVC devices to be on their own dedicated Matter bridge.
   * Using publishExternalAccessories ensures each RVC device gets its own bridge.
   */
  private registerSection12Robotic() {
    this.log.info('═'.repeat(80))
    this.log.info('Section 12: Robotic Devices (Matter Spec § 12)')
    this.log.info('═'.repeat(80))

    const context = { api: this.api, log: this.log, config: this.config }
    const accessories = [
      ...registerRoboticVacuumCleaner(context),
    ]

    if (accessories.length > 0) {
      this.log.info(`✓ Publishing ${accessories.length} robotic device(s) as external accessories`)
      for (const acc of accessories) {
        this.log.info(`  - ${acc.displayName} (dedicated bridge for Apple Home compatibility)`)
      }
      // Use publishExternalAccessories to give each RVC device its own bridge
      // This is required for Apple Home compatibility
      this.api.matter.publishExternalAccessories(PLUGIN_NAME, accessories)
    }
  }
}
