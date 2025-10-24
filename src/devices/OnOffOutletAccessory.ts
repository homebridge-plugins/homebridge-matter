/**
 * On/Off Outlet Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class OnOffOutletAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'OUTLET-001'
    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
      displayName: 'On/Off Outlet',
      deviceType: api.matter.deviceTypes.OnOffOutlet,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-OUTLET-ON-OFF',
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
    // TODO: await myOutletAPI.turnOn()
  }

  private async handleOff(): Promise<void> {
    this.logInfo('turning off.')
    // TODO: await myOutletAPI.turnOff()
  }

  public updateOnOffState(isOn: boolean): void {
    this.updateState(this.api.matter.clusterNames.OnOff, { onOff: isOn })
  }
}
