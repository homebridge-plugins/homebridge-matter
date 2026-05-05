/**
 * Humidity Sensor Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class HumiditySensorAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-humidity-sensor'
    const matter = getMatter(api)
    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'Humidity Sensor',
      deviceType: matter.deviceTypes.HumiditySensor,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-SENSOR-HUMIDITY',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        relativeHumidityMeasurement: {
          measuredValue: 5500, // 55% (in hundredths of a percent)
          minMeasuredValue: 0,
          maxMeasuredValue: 10000,
        },
      },
    })

    this.logInfo('initialized.')
  }

  public async updateHumidity(percent: number): Promise<void> {
    const value = Math.round(percent * 100) // convert to hundredths
    await this.updateState('relativeHumidityMeasurement', { measuredValue: value })
    this.logInfo(`humidity: ${percent}%.`)
  }
}
