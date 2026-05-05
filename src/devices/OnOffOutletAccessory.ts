/**
 * On/Off Outlet Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class OnOffOutletAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-onoff-outlet'
    const matter = getMatter(api)
    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'On/Off Outlet',
      deviceType: matter.deviceTypes.OnOffOutlet,
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

    // Example: Check for overcurrent protection
    // if (this.hasOvercurrentTripped) {
    //   throw new MatterStatus.InvalidInState('Outlet overcurrent protection tripped - reset required')
    // }

    // Example: Check power monitoring threshold
    // if (this.lastPowerDraw > this.maxWattage) {
    //   throw new MatterStatus.InvalidInState(`Cannot turn on - last load exceeded ${this.maxWattage}W limit`)
    // }

    // Example: Check if outlet is disabled by physical safety lock
    // if (this.isPhysicallyLocked) {
    //   throw new MatterStatus.PermissionDenied('Outlet is physically locked for safety')
    // }

    // TODO: await myOutletAPI.turnOn()
  }

  private async handleOff(): Promise<void> {
    this.logInfo('turning off.')

    // Example: Check if outlet can be turned off (some outlets with critical loads)
    // if (this.isCriticalLoad) {
    //   throw new MatterStatus.InvalidInState('Cannot turn off outlet with critical load connected')
    // }

    // TODO: await myOutletAPI.turnOff()
  }

  public async updateOnOffState(isOn: boolean): Promise<void> {
    await this.updateState(this.matter.clusterNames.OnOff, { onOff: isOn })
  }
}
