import type { API, Logging } from 'homebridge'

/**
 * State Management Examples for Matter Accessories
 *
 * This demonstrates the two key patterns for managing accessory state:
 *
 * 1. HANDLERS (Matter → Device)
 *    - Called when user controls device via Home app
 *    - Plugin sends command to actual device (cloud API, local network, etc.)
 *    - Analogous to HAP's setCharacteristic handlers
 *
 * 2. STATE UPDATES (Device → Matter)
 *    - Called when device state changes externally (native app, physical button, polling, etc.)
 *    - Plugin updates Matter state to reflect actual device state
 *    - Analogous to HAP's updateCharacteristic
 */
export class StateManagementExample {
  constructor(
    private readonly log: Logging,
    private readonly api: API,
  ) {}

  /**
   * Example 1: Smart Outlet with Two-Way Communication
   *
   * Demonstrates:
   * - Handler: User turns on outlet via Home app → control actual device
   * - State Update: Outlet turned on via native app → update Home app state
   */
  registerSmartOutletExample() {
    // Simulated device state (in real plugin, this would be your device API/SDK)
    let deviceIsOn = false

    // Function to control the actual device (cloud API, local network, etc.)
    const controlDevice = async (turnOn: boolean) => {
      this.log.info(`[Device Control] Sending command to turn outlet ${turnOn ? 'ON' : 'OFF'}`)

      // Example: Call your device API
      // await yourDeviceAPI.setOutletState(turnOn)

      // Simulate device response
      deviceIsOn = turnOn
      this.log.info(`[Device Control] ✓ Outlet is now ${turnOn ? 'ON' : 'OFF'}`)
    }

    // Register the Matter accessory
    this.api.registerMatterAccessory({
      uuid: 'example-outlet-state-management',
      displayName: 'Example Smart Outlet',
      deviceType: this.api.matterDeviceTypes.OnOffOutlet,
      serialNumber: 'OUTLET-STATE-001',
      manufacturer: 'State Management Examples',
      model: 'SmartOutlet v1',

      clusters: {
        onOff: {
          onOff: deviceIsOn, // Initial state
        },
      },

      // ===== PATTERN 1: HANDLERS (Matter → Device) =====
      // These are called when user controls device via Home app
      // Similar to HAP's characteristic.on('set', handler)
      handlers: {
        onOff: {
          on: async () => {
            this.log.info('[HANDLER] User turned ON outlet via Home app')

            // Control the actual device
            await controlDevice(true)

            // State is automatically updated in Matter after handler completes
            // No need to call updateMatterAccessoryState here!
          },

          off: async () => {
            this.log.info('[HANDLER] User turned OFF outlet via Home app')

            // Control the actual device
            await controlDevice(false)

            // State is automatically updated in Matter after handler completes
          },
        },
      },
    })

    // ===== PATTERN 2: STATE UPDATES (Device → Matter) =====
    // Call this when device state changes externally
    // Similar to HAP's characteristic.updateValue()

    // Example: Device state changed via native mobile app
    const handleNativeAppChange = (newState: boolean) => {
      this.log.info(`[EXTERNAL] Outlet turned ${newState ? 'ON' : 'OFF'} via native app`)

      // Update local state
      deviceIsOn = newState

      // Update Matter state WITHOUT triggering handlers
      // This is like HAP's updateCharacteristic - it just syncs the state
      this.api.updateMatterAccessoryState(
        'example-outlet-state-management',
        'onOff',
        { onOff: newState },
      )

      this.log.info('[EXTERNAL] ✓ Home app state updated to match device')
    }

    // Example: Device state changed via physical button
    const handlePhysicalButton = (newState: boolean) => {
      this.log.info(`[EXTERNAL] Outlet turned ${newState ? 'ON' : 'OFF'} via physical button`)

      deviceIsOn = newState

      // Update Matter state without triggering handlers
      this.api.updateMatterAccessoryState(
        'example-outlet-state-management',
        'onOff',
        { onOff: newState },
      )
    }

    // Example: Polling device state periodically
    // eslint-disable-next-line unused-imports/no-unused-vars
    const pollDeviceState = async () => {
      // In real plugin, fetch state from device API
      // const actualState = await yourDeviceAPI.getOutletState()

      // For demo, simulate random state changes
      const actualState = Math.random() > 0.5

      if (actualState !== deviceIsOn) {
        this.log.info(`[POLLING] Detected state change: ${actualState ? 'ON' : 'OFF'}`)

        deviceIsOn = actualState

        // Update Matter state without triggering handlers
        this.api.updateMatterAccessoryState(
          'example-outlet-state-management',
          'onOff',
          { onOff: actualState },
        )
      }
    }

    // Simulate external state changes for demonstration
    // In real plugin, these would be triggered by:
    // - WebSocket/SSE from cloud API
    // - Physical button press events
    // - Polling interval
    // - Push notifications

    // Demo: Native app changes after 10 seconds
    setTimeout(() => handleNativeAppChange(true), 10000)

    // Demo: Physical button press after 20 seconds
    setTimeout(() => handlePhysicalButton(false), 20000)

    // Demo: Poll every 30 seconds (optional - use events/webhooks when possible)
    // setInterval(pollDeviceState, 30000);
  }

  /**
   * Example 2: Dimmable Light with Brightness
   *
   * Shows how to handle multiple cluster attributes
   */
  registerDimmableLightExample() {
    let deviceIsOn = false
    let deviceBrightness = 127 // 0-254 scale

    // Device control function
    const controlDevice = async (on?: boolean, brightness?: number) => {
      if (on !== undefined) {
        deviceIsOn = on
        this.log.info(`[Device] Light turned ${on ? 'ON' : 'OFF'}`)
      }
      if (brightness !== undefined) {
        deviceBrightness = brightness
        this.log.info(`[Device] Brightness set to ${Math.round(brightness / 254 * 100)}%`)
      }
    }

    this.api.registerMatterAccessory({
      uuid: 'example-dimmable-light-state',
      displayName: 'Example Dimmable Light',
      deviceType: this.api.matterDeviceTypes.DimmableLight,
      serialNumber: 'LIGHT-STATE-001',
      manufacturer: 'State Management Examples',
      model: 'DimmableLight v1',

      clusters: {
        onOff: {
          onOff: deviceIsOn,
        },
        levelControl: {
          currentLevel: deviceBrightness,
          minLevel: 1,
          maxLevel: 254,
        },
      },

      handlers: {
        onOff: {
          on: async () => {
            await controlDevice(true)
          },
          off: async () => {
            await controlDevice(false)
          },
        },
        levelControl: {
          moveToLevel: async (args: any) => {
            this.log.info(`[HANDLER] User set brightness to ${args.level} via Home app`)
            await controlDevice(undefined, args.level)
          },
        },
      },
    })

    // Example: Device brightness changed via native app
    const handleBrightnessChange = (newBrightness: number) => {
      this.log.info(`[EXTERNAL] Brightness changed to ${Math.round(newBrightness / 254 * 100)}% via native app`)

      deviceBrightness = newBrightness

      // Update only the brightness attribute
      this.api.updateMatterAccessoryState(
        'example-dimmable-light-state',
        'levelControl',
        { currentLevel: newBrightness },
      )
    }

    // Example: Both on/off and brightness changed together
    const handleCompleteStateChange = (on: boolean, brightness: number) => {
      this.log.info(`[EXTERNAL] Complete state change: ${on ? 'ON' : 'OFF'} at ${Math.round(brightness / 254 * 100)}%`)

      deviceIsOn = on
      deviceBrightness = brightness

      // Update multiple clusters
      this.api.updateMatterAccessoryState(
        'example-dimmable-light-state',
        'onOff',
        { onOff: on },
      )

      this.api.updateMatterAccessoryState(
        'example-dimmable-light-state',
        'levelControl',
        { currentLevel: brightness },
      )
    }

    // Demo: Brightness change after 15 seconds
    setTimeout(() => handleBrightnessChange(200), 15000)

    // Demo: Complete state change after 25 seconds
    setTimeout(() => handleCompleteStateChange(true, 100), 25000)
  }

  /**
   * Example 3: Temperature Sensor (Read-Only)
   *
   * Sensors don't have handlers (no user commands)
   * Only need state updates when sensor readings change
   */
  registerTemperatureSensorExample() {
    let currentTemp = 2100 // 21.00°C in hundredths

    this.api.registerMatterAccessory({
      uuid: 'example-temp-sensor-state',
      displayName: 'Example Temperature Sensor',
      deviceType: this.api.matterDeviceTypes.TemperatureSensor,
      serialNumber: 'TEMP-STATE-001',
      manufacturer: 'State Management Examples',
      model: 'TempSensor v1',

      clusters: {
        temperatureMeasurement: {
          measuredValue: currentTemp,
          minMeasuredValue: -5000,
          maxMeasuredValue: 10000,
        },
      },

      // No handlers needed - sensors are read-only!
    })

    // Poll sensor reading every 60 seconds
    const updateTemperature = () => {
      // In real plugin: const temp = await yourSensorAPI.getTemperature()

      // Simulate temperature change
      currentTemp = 2100 + Math.floor(Math.random() * 500 - 250) // 21°C ± 2.5°C

      this.log.info(`[SENSOR] Temperature updated: ${(currentTemp / 100).toFixed(2)}°C`)

      // Update Matter state
      this.api.updateMatterAccessoryState(
        'example-temp-sensor-state',
        'temperatureMeasurement',
        { measuredValue: currentTemp },
      )
    }

    // Update temperature every minute
    setInterval(updateTemperature, 60000)

    // Initial update after 5 seconds
    setTimeout(updateTemperature, 5000)
  }

  /**
   * Summary of Patterns:
   *
   * HANDLERS (Matter → Device):
   * - Use when: User controls device via Home app
   * - Action: Send command to device (cloud API, local network, etc.)
   * - State: Automatically updated after handler completes
   * - Similar to: HAP's characteristic.on('set', handler)
   *
   * STATE UPDATES (Device → Matter):
   * - Use when: Device state changes externally (native app, button, sensor reading, etc.)
   * - Action: Update Matter state to match device state
   * - Method: api.updateMatterAccessoryState(uuid, cluster, attributes)
   * - Similar to: HAP's characteristic.updateValue()
   *
   * KEY DIFFERENCES FROM HAP:
   * - NO setCharacteristic equivalent - just call your control function directly
   * - Handlers are ONLY for incoming Matter commands
   * - updateMatterAccessoryState is ONLY for external state changes
   * - State automatically updates after handlers complete (no manual update needed)
   */
}
