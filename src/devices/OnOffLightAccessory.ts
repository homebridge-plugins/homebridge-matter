/**
 * On/Off Light Accessory Class
 *
 * Example implementation of a device class that extends BaseMatterAccessory.
 * This shows the pattern for creating device-specific classes.
 */

import type { API, Logger } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

/**
 * On/Off Light Device Class
 *
 * This class represents an on/off light accessory.
 * It extends BaseMatterAccessory to inherit common functionality.
 */
export class OnOffLightAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'LIGHT-001'
    const displayName = 'On/Off Light'
    const manufacturer = 'Homebridge Matter'
    const model = 'HB-MATTER-LIGHT-ON-OFF'
    const firmwareRevision = '2.0.0'
    const hardwareRevision = '1.0.0'

    // Call parent constructor with device configuration
    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
      displayName,
      deviceType: api.matter.deviceTypes.OnOffLight,
      serialNumber,
      manufacturer,
      model,
      firmwareRevision,
      hardwareRevision,

      // Initial cluster states
      clusters: {
        onOff: {
          onOff: true, // initial state: light is on
        },
      },

      // Command handlers
      handlers: {
        onOff: {
          on: async () => this.handleOnCommand(),
          off: async () => this.handleOffCommand(),
        },
      },
    })

    this.logInfo('initialized.')
  }

  /**
   * Handle the "on" command from Matter
   */
  private async handleOnCommand(): Promise<void> {
    this.logInfo('turning on.')

    try {
      // TODO: Control your physical device here
      // Examples:
      // await fetch('https://api.mydevice.com/light/on', { method: 'POST' })
      // await fetch('http://192.168.1.50/api/light/on')
      // mqttClient.publish('home/light/command', JSON.stringify({ state: 'ON' }))
      // await myLightAPI.turnOn(this.context.deviceId)

      this.logInfo('physical device turned on.')

      // State automatically updated by Homebridge after handler completes
    } catch (error) {
      this.logError('failed to turn on:', error)
      throw error
    }
  }

  /**
   * Handle the "off" command from Matter
   */
  private async handleOffCommand(): Promise<void> {
    this.logInfo('turning off.')

    try {
      // TODO: Control your physical device here
      // await myLightAPI.turnOff(this.context.deviceId)

      this.logInfo('physical device turned off.')

      // State automatically updated by Homebridge after handler completes
    } catch (error) {
      this.logError('failed to turn off:', error)
      throw error
    }
  }

  /**
   * Update the on/off state from external source
   * Call this when your physical device state changes externally
   */
  public updateOnOffState(isOn: boolean): void {
    this.updateState(this.api.matter.clusterNames.OnOff, { onOff: isOn })
    this.logInfo(`state synced: ${isOn ? 'ON' : 'OFF'}.`)
  }

  /**
   * Example: Start monitoring external state changes
   * This shows how you might set up event listeners or polling
   */
  public startMonitoring(): void {
    // Example: Event-based monitoring (recommended)
    // mqttClient.subscribe('home/light/status')
    // mqttClient.on('message', (topic, message) => {
    //   const { state } = JSON.parse(message.toString())
    //   const deviceIsOn = state === 'ON'
    //   this.updateOnOffState(deviceIsOn)
    // })

    // Example: Polling-based monitoring (fallback)
    // setInterval(async () => {
    //   try {
    //     const response = await fetch('https://api.mydevice.com/light/state')
    //     const data = await response.json()
    //     const deviceIsOn = data.power === 'on'
    //     this.updateOnOffState(deviceIsOn)
    //   } catch (error) {
    //     this.logError('Polling error:', error)
    //   }
    // }, 5000) // Poll every 5 seconds
  }
}
