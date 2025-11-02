/**
 * On/Off Switch Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class OnOffSwitchAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'SWITCH-001'
    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
      displayName: 'On/Off Switch',
      deviceType: api.matter.deviceTypes.OnOffSwitch,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-SWITCH-ON-OFF',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        onOff: {
          onOff: false,
        },
      },

      handlers: {
        onOff: {
          on: async () => this.handleOn(),
          off: async () => this.handleOff(),
        },
      },
    })

    this.logInfo('initialized.')
  }

  private async handleOn(): Promise<void> {
    this.logInfo('turning on.')

    // Example: Check if switch is in manual mode
    // if (this.isManualModeEnabled) {
    //   throw new MatterStatus.InvalidInState('Switch is in manual mode - disable to allow remote control')
    // }

    // Example: Check load type compatibility
    // if (this.loadType === 'inductive' && !this.supportsInductiveLoads) {
    //   throw new MatterStatus.InvalidAction('Switch not rated for inductive loads')
    // }

    // TODO: await mySwitchAPI.turnOn()
  }

  private async handleOff(): Promise<void> {
    this.logInfo('turning off.')

    // Example: Check if always-on mode is enabled
    // if (this.alwaysOnMode) {
    //   throw new MatterStatus.InvalidInState('Switch is configured for always-on operation')
    // }

    // TODO: await mySwitchAPI.turnOff()
  }

  public updateOnOffState(isOn: boolean): void {
    this.updateState(this.api.matter.clusterNames.OnOff, { onOff: isOn })
  }
}
