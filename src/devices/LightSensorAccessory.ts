/**
 * Light Sensor Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class LightSensorAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-light-sensor'
    const matter = getMatter(api)
    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'Light Sensor',
      deviceType: matter.deviceTypes.LightSensor,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-SENSOR-LIGHT',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        illuminanceMeasurement: {
          measuredValue: 5000,
          minMeasuredValue: 1,
          maxMeasuredValue: 65534,
        },
      },
    })

    this.logInfo('initialized.')
  }

  public async updateIlluminance(lux: number): Promise<void> {
    // Matter's scale is 10000 × log10(lux) + 1, with 0 for a level too low to measure
    const value = lux < 1
      ? 0
      : Math.min(0xFFFE, Math.round(10000 * Math.log10(lux) + 1))
    await this.updateState('illuminanceMeasurement', { measuredValue: value })
    this.logInfo(`illuminance: ${lux} lux.`)
  }
}
