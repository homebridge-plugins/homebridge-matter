import type {
  API,
  DynamicPlatformPlugin,
  Logging,
  MatterAccessory,
  MatterAPI,
  PlatformConfig,
} from 'homebridge'

import type {
  BaseMatterAccessory,
} from './devices/index.js'

import {
  AirQualitySensorAccessory,
  ColorTemperatureLightAccessory,
  ContactSensorAccessory,
  DimmableLightAccessory,
  DoorLockAccessory,
  ExtendedColorLightAccessory,
  FanAccessory,
  GenericSwitchAccessory,
  HumiditySensorAccessory,
  LeakSensorAccessory,
  LightSensorAccessory,
  OccupancySensorAccessory,
  OnOffLightAccessory,
  OnOffOutletAccessory,
  OnOffSwitchAccessory,
  PowerStripAccessory,
  RoboticVacuumAccessory,
  SmokeCOAlarmAccessory,
  TemperatureSensorAccessory,
  ThermostatAccessory,
  VenetianBlindAccessory,
  WindowBlindAccessory,
} from './devices/index.js'
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js'
import { getMatter, parseError } from './utils.js'

/**
 * MatterPlatform
 * Demonstrates all available Matter device types in Homebridge
 *
 * Organized by official Matter Specification v1.4.1 categories
 */
export class MatterPlatform implements DynamicPlatformPlugin {
  // Track restored HAP cached accessories (required for DynamicPlatformPlugin)
  // This is commented out here as this plugin does not have any HAP accessories
  // public readonly accessories: Map<string, PlatformAccessory> = new Map()

  // Track restored Matter cached accessories
  public readonly matterAccessories: Map<string, MatterAccessory> = new Map()

  // Every device instance this run created. The platform has to hold these,
  // because a device that arms a timer can only be stopped through its own
  // instance - and without that, the timer keeps the fork's event loop alive
  // after Homebridge has asked it to shut down.
  private readonly devices: BaseMatterAccessory[] = []

  // Resolved once `isMatterEnabled` has gated the registration path; safe to use
  // from `didFinishLaunching` onwards.
  private readonly matter!: MatterAPI

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

    this.matter = getMatter(this.api)

    // Stop anything a device left running, so the process can exit promptly
    this.api.on('shutdown', () => {
      this.devices.forEach((device) => {
        try {
          device.shutdown()
        } catch (error) {
          this.log.debug('Failed to shut down a device cleanly:', parseError(error))
        }
      })
    })

    // Register Matter accessories when Homebridge has finished launching
    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback')

      // Without this catch, anything that rejects inside the registration chain
      // becomes an unhandled rejection. Homebridge installs no handler for those,
      // so the bridge is terminated rather than told what went wrong.
      this.registerMatterAccessories().catch((error) => {
        this.log.error('Failed to register Matter accessories:', error instanceof Error ? error.message : error)
      })
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
   * Called when homebridge restores cached Matter accessories from disk at startup.
   *
   * This is where you can access the `accessory.context` object to retrieve
   * any custom data you stored when the accessory was originally registered.
   */
  configureMatterAccessory(accessory: MatterAccessory) {
    this.log.debug('Loading cached Matter accessory:', accessory.displayName)
    this.matterAccessories.set(accessory.UUID, accessory)
  }

  /**
   * Register all Matter accessories
   */
  private async registerMatterAccessories() {
    this.log.info('═'.repeat(80))
    this.log.info('Homebridge Matter Plugin')
    this.log.info('═'.repeat(80))

    // Remove accessories that are disabled in config
    await this.removeDisabledAccessories()

    // Register devices by Matter specification sections. Each section is kept
    // separate so that one failing does not silently skip every section after it
    const sections: [string, () => Promise<void>][] = [
      ['lighting', () => this.registerSection4Lighting()],
      ['smart plug', () => this.registerSection5SmartPlugs()],
      ['switch', () => this.registerSection6Switches()],
      ['sensor', () => this.registerSection7Sensors()],
      ['closure', () => this.registerSection8Closure()],
      ['HVAC', () => this.registerSection9HVAC()],
      ['robotic', () => this.registerSection12Robotic()],
      ['custom', () => this.registerCustomDevices()],
    ]

    for (const [name, register] of sections) {
      try {
        await register()
      } catch (error) {
        this.log.error(`Failed to register the ${name} accessories:`, error instanceof Error ? error.message : error)
      }
    }

    this.log.info('═'.repeat(80))
    this.log.info('Finished registering Matter accessories')
    this.log.info('═'.repeat(80))
  }

  /**
   * Keep hold of a device instance and hand back the plain accessory object that
   * gets registered. Holding the instance is what makes an orderly shutdown
   * possible - see the `shutdown` listener in the constructor.
   */
  private track(device: BaseMatterAccessory): MatterAccessory {
    this.devices.push(device)
    return device.toAccessory()
  }

  /**
   * Register one specification section from a table of config key -> device.
   *
   * The heading only prints when the section has something in it. It used to
   * print unconditionally, so a section with nothing enabled left three lines of
   * heading with nothing underneath - six wasted lines on a typical config, for
   * the sections the user had switched off.
   *
   * ⚠️ The enabled check has to happen BEFORE the devices are constructed: each
   * accessory constructor logs its own "initialized." line, and those belong
   * under the heading rather than above it. Building the list first and then
   * deciding whether to print would put them in the wrong order.
   */
  private async registerSection(
    title: string,
    label: string,
    devices: [configKey: string, build: () => BaseMatterAccessory][],
    suffix = '',
  ): Promise<void> {
    const enabled = devices.filter(([configKey]) => this.config[configKey] === true)
    if (enabled.length === 0) {
      return
    }

    this.log.info('═'.repeat(80))
    this.log.info(title)
    this.log.info('═'.repeat(80))

    const accessories = enabled.map(([, build]) => this.track(build()))

    this.log.info(`✓ Registered ${accessories.length} ${label}`)
    for (const accessory of accessories) {
      this.log.info(`  - ${accessory.displayName}${suffix}`)
    }

    await this.matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessories)
  }

  /**
   * Remove accessories that are disabled in config
   */
  private async removeDisabledAccessories() {
    const configMap = [
      { enabled: this.config.enableOnOffLight, uuid: this.matter.uuid.generate('matter-onoff-light'), name: 'On/Off Light' },
      { enabled: this.config.enableDimmableLight, uuid: this.matter.uuid.generate('matter-dimmable-light'), name: 'Dimmable Light' },
      { enabled: this.config.enableColourTemperatureLight, uuid: this.matter.uuid.generate('matter-colour-temp-light'), name: 'Colour Temperature Light' },
      { enabled: this.config.enableExtendedColourLight, uuid: this.matter.uuid.generate('matter-extended-colour-light'), name: 'Extended Colour Light' },
      { enabled: this.config.enableOnOffOutlet, uuid: this.matter.uuid.generate('matter-onoff-outlet'), name: 'On/Off Outlet' },
      { enabled: this.config.enableOnOffSwitch, uuid: this.matter.uuid.generate('matter-onoff-switch'), name: 'On/Off Switch' },
      { enabled: this.config.enableGenericSwitch, uuid: this.matter.uuid.generate('matter-generic-switch'), name: 'Generic Switch' },
      { enabled: this.config.enableAirQualitySensor, uuid: this.matter.uuid.generate('matter-air-quality-sensor'), name: 'Air Quality Sensor' },
      { enabled: this.config.enableTemperatureSensor, uuid: this.matter.uuid.generate('matter-temperature-sensor'), name: 'Temperature Sensor' },
      { enabled: this.config.enableHumiditySensor, uuid: this.matter.uuid.generate('matter-humidity-sensor'), name: 'Humidity Sensor' },
      { enabled: this.config.enableLightSensor, uuid: this.matter.uuid.generate('matter-light-sensor'), name: 'Light Sensor' },
      { enabled: this.config.enableOccupancySensor, uuid: this.matter.uuid.generate('matter-occupancy-sensor'), name: 'Occupancy Sensor' },
      { enabled: this.config.enableContactSensor, uuid: this.matter.uuid.generate('matter-contact-sensor'), name: 'Contact Sensor' },
      { enabled: this.config.enableLeakSensor, uuid: this.matter.uuid.generate('matter-leak-sensor'), name: 'Leak Sensor' },
      { enabled: this.config.enableSmokeSensor, uuid: this.matter.uuid.generate('matter-smoke-sensor'), name: 'Smoke Sensor' },
      { enabled: this.config.enableDoorLock, uuid: this.matter.uuid.generate('matter-door-lock'), name: 'Door Lock' },
      { enabled: this.config.enableWindowBlind, uuid: this.matter.uuid.generate('matter-window-blind'), name: 'Window Blind' },
      { enabled: this.config.enableVenetianBlind, uuid: this.matter.uuid.generate('matter-venetian-blind'), name: 'Venetian Blind' },
      { enabled: this.config.enableThermostat, uuid: this.matter.uuid.generate('matter-thermostat'), name: 'Thermostat' },
      { enabled: this.config.enableFan, uuid: this.matter.uuid.generate('matter-fan'), name: 'Fan' },
      { enabled: this.config.enableRobotVacuum, uuid: this.matter.uuid.generate('matter-robot-vacuum'), name: 'Robot Vacuum' },
      { enabled: this.config.enablePowerStrip, uuid: this.matter.uuid.generate('matter-power-strip'), name: 'Power Strip' },
      // Retired device type (custom Colour Light, removed in 87e74c8) — always
      // remove so users who registered it before the removal don't keep an
      // orphaned cached accessory.
      { enabled: false, uuid: this.matter.uuid.generate('matter-colour-light'), name: 'Colour Light' },
    ]

    for (const { enabled, uuid, name } of configMap) {
      if (enabled !== true) {
        try {
          const existingAccessory = this.matterAccessories.get(uuid)
          if (existingAccessory) {
            this.log.warn(`Removing accessory '${name}' (disabled in config).`)
            await this.matter.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory])
            this.matterAccessories.delete(uuid)
            this.log.debug(`Accessory '${name}' removed successfully.`)
          } else {
            this.log.debug(`Cannot remove accessory '${name}': not found among cached accessories.`)
          }
        } catch (error) {
          this.log.warn(`Error removing accessory '${name}': ${parseError(error)}.`)
        }
      }
    }
  }

  /**
   * Section 4: Lighting Devices (Matter Spec § 4)
   */
  private async registerSection4Lighting() {
    await this.registerSection('Section 4: Lighting Devices (Matter Spec § 4)', 'lighting device(s)', [
      ['enableOnOffLight', () => new OnOffLightAccessory(this.api, this.log)],
      ['enableDimmableLight', () => new DimmableLightAccessory(this.api, this.log)],
      ['enableColourTemperatureLight', () => new ColorTemperatureLightAccessory(this.api, this.log)],
      ['enableExtendedColourLight', () => new ExtendedColorLightAccessory(this.api, this.log)],
    ])
  }

  /**
   * Section 5: Smart Plugs/Actuators (Matter Spec § 5)
   */
  private async registerSection5SmartPlugs() {
    await this.registerSection('Section 5: Smart Plugs/Actuators (Matter Spec § 5)', 'smart plug/actuator device(s)', [
      ['enableOnOffOutlet', () => new OnOffOutletAccessory(this.api, this.log)],
    ])
  }

  /**
   * Section 6: Switches & Controllers (Matter Spec § 6)
   */
  private async registerSection6Switches() {
    await this.registerSection('Section 6: Switches & Controllers (Matter Spec § 6)', 'switch/controller device(s)', [
      ['enableOnOffSwitch', () => new OnOffSwitchAccessory(this.api, this.log)],
      // Generic Switch is the stateless remote / button
      ['enableGenericSwitch', () => new GenericSwitchAccessory(this.api, this.log)],
    ])
  }

  /**
   * Section 7: Sensors (Matter Spec § 7)
   */
  private async registerSection7Sensors() {
    await this.registerSection('Section 7: Sensors (Matter Spec § 7)', 'sensor device(s)', [
      ['enableAirQualitySensor', () => new AirQualitySensorAccessory(this.api, this.log)],
      ['enableContactSensor', () => new ContactSensorAccessory(this.api, this.log)],
      ['enableLightSensor', () => new LightSensorAccessory(this.api, this.log)],
      ['enableOccupancySensor', () => new OccupancySensorAccessory(this.api, this.log)],
      ['enableTemperatureSensor', () => new TemperatureSensorAccessory(this.api, this.log)],
      ['enableHumiditySensor', () => new HumiditySensorAccessory(this.api, this.log)],
      // The smoke sensor demonstrates the combined Smoke/CO alarm cluster
      ['enableSmokeSensor', () => new SmokeCOAlarmAccessory(this.api, this.log)],
      ['enableLeakSensor', () => new LeakSensorAccessory(this.api, this.log)],
    ])
  }

  /**
   * Section 8: Closure Devices (Matter Spec § 8)
   */
  private async registerSection8Closure() {
    await this.registerSection('Section 8: Closure Devices (Matter Spec § 8)', 'closure device(s)', [
      ['enableDoorLock', () => new DoorLockAccessory(this.api, this.log)],
      ['enableWindowBlind', () => new WindowBlindAccessory(this.api, this.log)],
      ['enableVenetianBlind', () => new VenetianBlindAccessory(this.api, this.log)],
    ])
  }

  /**
   * Section 9: HVAC (Matter Spec § 9)
   */
  private async registerSection9HVAC() {
    await this.registerSection('Section 9: HVAC (Matter Spec § 9)', 'HVAC device(s)', [
      ['enableThermostat', () => new ThermostatAccessory(this.api, this.log, this.config)],
      ['enableFan', () => new FanAccessory(this.api, this.log)],
    ])
  }

  /**
   * Section 12: Robotic Devices (Matter Spec § 12)
   * ⚠️ IMPORTANT: RVC devices use a DIFFERENT PROCESS (same code) than other devices!
   * When this runs, you'll see separate commissioning codes in the logs for the robot vacuum.
   * Use those codes to pair the vacuum as a separate bridge in your Home app.
   */
  private async registerSection12Robotic() {
    await this.registerSection('Section 12: Robotic Devices (Matter Spec § 12)', 'robot vacuum device(s)', [
      ['enableRobotVacuum', () => new RoboticVacuumAccessory(this.api, this.log)],
    ], ' (standalone for Apple Home compatibility)')
  }

  /**
   * Custom Devices
   *
   * This section demonstrates custom device implementations that go beyond
   * the standard Matter device types. These examples show advanced patterns
   * like managing multiple logical components within a single device.
   */
  private async registerCustomDevices() {
    await this.registerSection('Custom Devices', 'custom device(s)', [
      // The power strip is one device with four independent outlet endpoints
      ['enablePowerStrip', () => new PowerStripAccessory(this.api, this.log)],
    ])
  }
}
