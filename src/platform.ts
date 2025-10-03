import type { API, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig } from 'homebridge';

/**
 * MatterPlatform
 * Demonstrates all available Matter device types in Homebridge
 */
export class ExampleHomebridgePlatform implements DynamicPlatformPlugin {
  // Track restored cached accessories (required for DynamicPlatformPlugin)
  public readonly accessories: Map<string, PlatformAccessory> = new Map();

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    // Check if the user has matter enabled
    if (!this.api.isMatterEnabled?.()) {
      this.log.warn('Matter is not enabled in Homebridge. Please enable Matter in the Homebridge settings to use this plugin.');
      return;
    }

    // Register Matter accessories when Homebridge has finished launching
    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.registerMatterAccessories();
    });
  }

  /**
   * Required for DynamicPlatformPlugin
   * Called when homebridge restores cached accessories from disk at startup
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.set(accessory.UUID, accessory);
  }

  /**
   * Register all Matter accessory examples
   */
  private registerMatterAccessories() {
    this.log.info('Registering Matter accessories...');

    // Register each device type
    this.registerLightingDevices();
    // this.registerSwitchesAndOutlets();
    // this.registerSensors();
    // this.registerHVAC();
    // this.registerSecurity();
    // this.registerOtherDevices();

    this.log.info('Finished registering Matter accessories');
  }

  /**
   * Lighting Devices
   */
  private registerLightingDevices() {
    // 1. On/Off Light
    this.api.registerMatterAccessory({
      uuid: 'matter-onoff-light',
      displayName: 'On/Off Light',
      deviceType: this.api.matterDeviceTypes.OnOffLight,
      serialNumber: 'LIGHT-001',
      manufacturer: 'Matter Examples',
      model: 'OnOffLight v1',

      clusters: {
        onOff: {
          onOff: false,
        },
      },

      handlers: {
        onOff: {
          on: async () => {
            this.log.info('[On/Off Light] Turned ON');
          },
          off: async () => {
            this.log.info('[On/Off Light] Turned OFF');
          },
        },
      },
    });

    // 2. Dimmable Light
    this.api.registerMatterAccessory({
      uuid: 'matter-dimmable-light',
      displayName: 'Dimmable Light',
      deviceType: this.api.matterDeviceTypes.DimmableLight,
      serialNumber: 'LIGHT-002',
      manufacturer: 'Matter Examples',
      model: 'DimmableLight v1',

      clusters: {
        onOff: {
          onOff: false,
        },
        levelControl: {
          currentLevel: 127, // 50% brightness (1-254 scale)
          minLevel: 1,
          maxLevel: 254,
        },
      },

      handlers: {
        onOff: {
          on: async () => {
            this.log.info('[Dimmable Light] Turned ON');
          },
          off: async () => {
            this.log.info('[Dimmable Light] Turned OFF');
          },
        },
        levelControl: {
          moveToLevel: async (args: any) => {
            this.log.info(`[Dimmable Light] Brightness changed to ${args.level} (${Math.round(args.level / 254 * 100)}%)`);
          },
        },
      },
    });
    //
    // // 3. Color Temperature Light
    // this.api.registerMatterAccessory({
    //   uuid: 'matter-color-temp-light',
    //   displayName: 'Color Temperature Light',
    //   deviceType: this.api.matterDeviceTypes.ColorTemperatureLight,
    //   serialNumber: 'LIGHT-003',
    //   manufacturer: 'Matter Examples',
    //   model: 'ColorTempLight v1',
    //
    //   clusters: {
    //     onOff: {
    //       onOff: false,
    //     },
    //     levelControl: {
    //       currentLevel: 127,
    //       minLevel: 1,
    //       maxLevel: 254,
    //     },
    //     colorControl: {
    //       colorMode: 2, // Color temperature mode
    //       colorTemperatureMireds: 250, // ~4000K
    //       colorTempPhysicalMinMireds: 147, // 6800K
    //       colorTempPhysicalMaxMireds: 454, // 2200K
    //     },
    //   },
    //
    //   handlers: {
    //     onOff: {
    //       on: async () => {
    //         this.log.info('[Color Temp Light] Turned ON');
    //       },
    //       off: async () => {
    //         this.log.info('[Color Temp Light] Turned OFF');
    //       },
    //     },
    //     levelControl: {
    //       moveToLevel: async (args: any) => {
    //         this.log.info(`[Color Temp Light] Brightness changed to ${args.level}`);
    //       },
    //     },
    //     colorControl: {
    //       moveToColorTemperature: async (args: any) => {
    //         const kelvin = Math.round(1000000 / args.colorTemperatureMireds);
    //         this.log.info(`[Color Temp Light] Color temperature changed to ${args.colorTemperatureMireds} mireds (~${kelvin}K)`);
    //       },
    //     },
    //   },
    // });
    //
    // // 4. Extended Color Light (RGB)
    // this.api.registerMatterAccessory({
    //   uuid: 'matter-rgb-light',
    //   displayName: 'RGB Color Light',
    //   deviceType: this.api.matterDeviceTypes.ExtendedColorLight,
    //   serialNumber: 'LIGHT-004',
    //   manufacturer: 'Matter Examples',
    //   model: 'RGBLight v1',
    //
    //   clusters: {
    //     onOff: {
    //       onOff: false,
    //     },
    //     levelControl: {
    //       currentLevel: 127,
    //       minLevel: 1,
    //       maxLevel: 254,
    //     },
    //     colorControl: {
    //       colorMode: 1, // Hue/Saturation mode
    //       currentHue: 0, // Red
    //       currentSaturation: 254, // Full saturation
    //       colorCapabilities: 0x0001, // Hue/Saturation support
    //     },
    //   },
    //
    //   handlers: {
    //     onOff: {
    //       on: async () => {
    //         this.log.info('[RGB Light] Turned ON');
    //       },
    //       off: async () => {
    //         this.log.info('[RGB Light] Turned OFF');
    //       },
    //     },
    //     levelControl: {
    //       moveToLevel: async (args: any) => {
    //         this.log.info(`[RGB Light] Brightness changed to ${args.level}`);
    //       },
    //     },
    //     colorControl: {
    //       moveToHue: async (args: any) => {
    //         this.log.info(`[RGB Light] Hue changed to ${args.hue}`);
    //       },
    //       moveToSaturation: async (args: any) => {
    //         this.log.info(`[RGB Light] Saturation changed to ${args.saturation}`);
    //       },
    //       moveToHueAndSaturation: async (args: any) => {
    //         this.log.info(`[RGB Light] Color changed to H:${args.hue} S:${args.saturation}`);
    //       },
    //     },
    //   },
    // });
  }

  /**
   * Switches and Outlets
   */
  private registerSwitchesAndOutlets() {
    // 5. On/Off Switch
    this.api.registerMatterAccessory({
      uuid: 'matter-switch',
      displayName: 'On/Off Switch',
      deviceType: this.api.matterDeviceTypes.OnOffSwitch,
      serialNumber: 'SWITCH-001',
      manufacturer: 'Matter Examples',
      model: 'Switch v1',

      clusters: {
        onOff: {
          onOff: false,
        },
      },

      handlers: {
        onOff: {
          on: async () => {
            this.log.info('[Switch] Turned ON');
          },
          off: async () => {
            this.log.info('[Switch] Turned OFF');
          },
        },
      },
    });

    // 6. On/Off Outlet
    this.api.registerMatterAccessory({
      uuid: 'matter-outlet',
      displayName: 'Smart Outlet',
      deviceType: this.api.matterDeviceTypes.OnOffOutlet,
      serialNumber: 'OUTLET-001',
      manufacturer: 'Matter Examples',
      model: 'Outlet v1',

      clusters: {
        onOff: {
          onOff: false,
        },
      },

      handlers: {
        onOff: {
          on: async () => {
            this.log.info('[Outlet] Turned ON');
          },
          off: async () => {
            this.log.info('[Outlet] Turned OFF');
          },
        },
      },
    });

    // 7. Dimmable Outlet
    this.api.registerMatterAccessory({
      uuid: 'matter-dimmable-outlet',
      displayName: 'Dimmable Outlet',
      deviceType: this.api.matterDeviceTypes.DimmableOutlet,
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
            this.log.info('[Dimmable Outlet] Turned ON');
          },
          off: async () => {
            this.log.info('[Dimmable Outlet] Turned OFF');
          },
        },
        levelControl: {
          moveToLevel: async (args: any) => {
            this.log.info(`[Dimmable Outlet] Level changed to ${args.level}`);
          },
        },
      },
    });
  }

  /**
   * Sensors
   */
  private registerSensors() {
    // 8. Temperature Sensor
    this.api.registerMatterAccessory({
      uuid: 'matter-temp-sensor',
      displayName: 'Temperature Sensor',
      deviceType: this.api.matterDeviceTypes.TemperatureSensor,
      serialNumber: 'TEMP-001',
      manufacturer: 'Matter Examples',
      model: 'TempSensor v1',

      clusters: {
        temperatureMeasurement: {
          measuredValue: 2100, // 21.00°C (in hundredths of degree Celsius)
          minMeasuredValue: -5000, // -50°C
          maxMeasuredValue: 10000, // 100°C
        },
      },
    });

    // 9. Humidity Sensor
    this.api.registerMatterAccessory({
      uuid: 'matter-humidity-sensor',
      displayName: 'Humidity Sensor',
      deviceType: this.api.matterDeviceTypes.HumiditySensor,
      serialNumber: 'HUM-001',
      manufacturer: 'Matter Examples',
      model: 'HumiditySensor v1',

      clusters: {
        relativeHumidityMeasurement: {
          measuredValue: 5000, // 50% (in hundredths of percent)
          minMeasuredValue: 0,
          maxMeasuredValue: 10000, // 100%
        },
      },
    });

    // 10. Light Sensor
    this.api.registerMatterAccessory({
      uuid: 'matter-light-sensor',
      displayName: 'Light Sensor',
      deviceType: this.api.matterDeviceTypes.LightSensor,
      serialNumber: 'LIGHT-SENSOR-001',
      manufacturer: 'Matter Examples',
      model: 'LightSensor v1',

      clusters: {
        illuminanceMeasurement: {
          measuredValue: 1000, // Lux value
          minMeasuredValue: 1,
          maxMeasuredValue: 65535,
        },
      },
    });

    // 11. Motion Sensor
    this.api.registerMatterAccessory({
      uuid: 'matter-motion-sensor',
      displayName: 'Motion Sensor',
      deviceType: this.api.matterDeviceTypes.MotionSensor,
      serialNumber: 'MOTION-001',
      manufacturer: 'Matter Examples',
      model: 'MotionSensor v1',

      clusters: {
        occupancySensing: {
          occupancy: 0, // 0 = not occupied, 1 = occupied
          occupancySensorType: 0, // PIR sensor
        },
      },
    });

    // 12. Contact Sensor
    this.api.registerMatterAccessory({
      uuid: 'matter-contact-sensor',
      displayName: 'Contact Sensor',
      deviceType: this.api.matterDeviceTypes.ContactSensor,
      serialNumber: 'CONTACT-001',
      manufacturer: 'Matter Examples',
      model: 'ContactSensor v1',

      clusters: {
        booleanState: {
          stateValue: false, // false = contact, true = no contact
        },
      },
    });

    // 13. Leak Sensor
    this.api.registerMatterAccessory({
      uuid: 'matter-leak-sensor',
      displayName: 'Water Leak Sensor',
      deviceType: this.api.matterDeviceTypes.LeakSensor,
      serialNumber: 'LEAK-001',
      manufacturer: 'Matter Examples',
      model: 'LeakSensor v1',

      clusters: {
        booleanState: {
          stateValue: false, // false = no leak, true = leak detected
        },
      },
    });

    // 14. Smoke Sensor
    this.api.registerMatterAccessory({
      uuid: 'matter-smoke-sensor',
      displayName: 'Smoke/CO Alarm',
      deviceType: this.api.matterDeviceTypes.SmokeSensor,
      serialNumber: 'SMOKE-001',
      manufacturer: 'Matter Examples',
      model: 'SmokeCOAlarm v1',

      clusters: {
        smokeCoAlarm: {
          smokeState: 0, // 0 = normal, 1 = warning, 2 = critical
          coState: 0, // 0 = normal, 1 = warning, 2 = critical
          batteryAlert: 0, // 0 = normal, 1 = warning, 2 = critical
        },
      },
    });
  }

  /**
   * HVAC Devices
   */
  private registerHVAC() {
    // 15. Thermostat
    this.api.registerMatterAccessory({
      uuid: 'matter-thermostat',
      displayName: 'Thermostat',
      deviceType: this.api.matterDeviceTypes.Thermostat,
      serialNumber: 'THERMO-001',
      manufacturer: 'Matter Examples',
      model: 'Thermostat v1',

      clusters: {
        thermostat: {
          localTemperature: 2100, // 21°C (in hundredths)
          occupiedCoolingSetpoint: 2400, // 24°C
          occupiedHeatingSetpoint: 2000, // 20°C
          systemMode: 1, // 0 = Off, 1 = Auto, 3 = Cool, 4 = Heat
          controlSequenceOfOperation: 4, // Cooling and heating
        },
      },

      handlers: {
        thermostat: {
          setpointRaiseLower: async (args: any) => {
            this.log.info(`[Thermostat] Setpoint changed by ${args.amount / 10}°C`);
          },
        },
      },
    });

    // 16. Fan
    this.api.registerMatterAccessory({
      uuid: 'matter-fan',
      displayName: 'Fan',
      deviceType: this.api.matterDeviceTypes.Fan,
      serialNumber: 'FAN-001',
      manufacturer: 'Matter Examples',
      model: 'Fan v1',

      clusters: {
        fanControl: {
          fanMode: 0, // 0 = Off, 1 = Low, 2 = Medium, 3 = High, 4 = On, 5 = Auto, 6 = Smart
          percentCurrent: 0,
          percentSetting: 0,
        },
      },

      handlers: {
        fanControl: {
          step: async (args: any) => {
            this.log.info(`[Fan] Step ${args.direction === 0 ? 'increase' : 'decrease'}`);
          },
        },
      },
    });
  }

  /**
   * Security Devices
   */
  private registerSecurity() {
    // 17. Door Lock
    this.api.registerMatterAccessory({
      uuid: 'matter-door-lock',
      displayName: 'Smart Door Lock',
      deviceType: this.api.matterDeviceTypes.DoorLock,
      serialNumber: 'LOCK-001',
      manufacturer: 'Matter Examples',
      model: 'DoorLock v1',

      clusters: {
        doorLock: {
          lockState: 1, // 0 = not fully locked, 1 = locked, 2 = unlocked
          lockType: 0, // 0 = dead bolt
          actuatorEnabled: true,
        },
      },

      handlers: {
        doorLock: {
          lockDoor: async () => {
            this.log.info('[Door Lock] Locked');
          },
          unlockDoor: async () => {
            this.log.info('[Door Lock] Unlocked');
          },
        },
      },
    });
  }

  /**
   * Other Devices
   */
  private registerOtherDevices() {
    // 18. Window Covering
    this.api.registerMatterAccessory({
      uuid: 'matter-window-covering',
      displayName: 'Window Blinds',
      deviceType: this.api.matterDeviceTypes.WindowCovering,
      serialNumber: 'BLIND-001',
      manufacturer: 'Matter Examples',
      model: 'WindowCovering v1',

      clusters: {
        windowCovering: {
          currentPositionLiftPercent100ths: 0, // 0 = fully open, 10000 = fully closed
          targetPositionLiftPercent100ths: 0,
          type: 0, // 0 = rollershade
          configStatus: 0x03, // operational and online
        },
      },

      handlers: {
        windowCovering: {
          upOrOpen: async () => {
            this.log.info('[Window Covering] Opening');
          },
          downOrClose: async () => {
            this.log.info('[Window Covering] Closing');
          },
          stopMotion: async () => {
            this.log.info('[Window Covering] Stopped');
          },
          goToLiftPercentage: async (args: any) => {
            this.log.info(`[Window Covering] Moving to ${args.liftPercent100thsValue / 100}%`);
          },
        },
      },
    });

    // 19. Generic Switch
    this.api.registerMatterAccessory({
      uuid: 'matter-generic-switch',
      displayName: 'Generic Switch',
      deviceType: this.api.matterDeviceTypes.GenericSwitch,
      serialNumber: 'GSWITCH-001',
      manufacturer: 'Matter Examples',
      model: 'GenericSwitch v1',

      clusters: {
        switch: {
          numberOfPositions: 2,
          currentPosition: 0,
        },
      },
    });

    // 20. Pump
    this.api.registerMatterAccessory({
      uuid: 'matter-pump',
      displayName: 'Water Pump',
      deviceType: this.api.matterDeviceTypes.Pump,
      serialNumber: 'PUMP-001',
      manufacturer: 'Matter Examples',
      model: 'Pump v1',

      clusters: {
        onOff: {
          onOff: false,
        },
        pumpConfigurationAndControl: {
          effectiveOperationMode: 0, // 0 = normal
          effectiveControlMode: 0, // 0 = constant speed
        },
      },

      handlers: {
        onOff: {
          on: async () => {
            this.log.info('[Pump] Turned ON');
          },
          off: async () => {
            this.log.info('[Pump] Turned OFF');
          },
        },
      },
    });

    // 21. Room Air Conditioner
    this.api.registerMatterAccessory({
      uuid: 'matter-air-conditioner',
      displayName: 'Air Conditioner',
      deviceType: this.api.matterDeviceTypes.RoomAirConditioner,
      serialNumber: 'AC-001',
      manufacturer: 'Matter Examples',
      model: 'RoomAC v1',

      clusters: {
        onOff: {
          onOff: false,
        },
        thermostat: {
          localTemperature: 2500, // 25°C
          occupiedCoolingSetpoint: 2200, // 22°C
          systemMode: 3, // Cool mode
          controlSequenceOfOperation: 2, // Cooling only
        },
        fanControl: {
          fanMode: 5, // Auto
          percentCurrent: 50,
          percentSetting: 50,
        },
      },

      handlers: {
        onOff: {
          on: async () => {
            this.log.info('[Air Conditioner] Turned ON');
          },
          off: async () => {
            this.log.info('[Air Conditioner] Turned OFF');
          },
        },
        thermostat: {
          setpointRaiseLower: async (args: any) => {
            this.log.info(`[Air Conditioner] Temperature setpoint changed by ${args.amount / 10}°C`);
          },
        },
        fanControl: {
          step: async (args: any) => {
            this.log.info(`[Air Conditioner] Fan step ${args.direction === 0 ? 'increase' : 'decrease'}`);
          },
        },
      },
    });
  }
}
