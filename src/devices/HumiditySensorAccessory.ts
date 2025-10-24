/**
 * Humidity Sensor Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class HumiditySensorAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'SENSOR-005'
    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
      displayName: 'Humidity Sensor',
      deviceType: api.matter.deviceTypes.HumiditySensor,
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

  public updateHumidity(percent: number): void {
    const value = Math.round(percent * 100) // Convert to hundredths
    this.updateState('relativeHumidityMeasurement', { measuredValue: value })
    this.logInfo((`humidity: ${percent}%.`))
  }
}
