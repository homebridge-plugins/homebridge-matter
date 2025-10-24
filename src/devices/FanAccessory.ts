/**
 * Fan Accessory Class
 */

import type { API, Logger, MatterRequests } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class FanAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'FAN-001'
    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
      displayName: 'Fan',
      deviceType: api.matter.deviceTypes.Fan,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-FAN',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        fanControl: {
          fanMode: api.matter.types.FanControl.FanMode.Off,
          fanModeSequence: api.matter.types.FanControl.FanModeSequence.OffLowMedHigh,
          percentSetting: 0,
          percentCurrent: 0,
        },
      },

      handlers: {
        fanControl: {
          step: async (request: MatterRequests.FanStep) => this.handleStep(request),
        },
      },
    })

    this.logInfo('initialized.')
  }

  private async handleStep(request: MatterRequests.FanStep): Promise<void> {
    this.logInfo(`FanStep request: ${JSON.stringify(request)}`)
    const { direction, wrap, lowestOff } = request
    const dirStr = direction === 0 ? 'increase' : 'decrease'
    this.logInfo(`step ${dirStr} (wrap: ${wrap}, lowestoff: ${lowestOff}).`)
    // TODO: await myFanAPI.step(direction, wrap, lowestOff)
  }

  public updateFanMode(mode: number): void {
    this.updateState('fanControl', { fanMode: mode })
  }

  public updateFanSpeed(percent: number): void {
    this.updateState('fanControl', {
      percentSetting: percent,
      percentCurrent: percent,
    })
    this.logInfo(`fan speed: ${percent}%.`)
  }
}
