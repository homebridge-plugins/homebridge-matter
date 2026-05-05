/**
 * Temperature Sensor Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class TemperatureSensorAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-temperature-sensor'
    const matter = getMatter(api)
    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'Temperature Sensor',
      deviceType: matter.deviceTypes.TemperatureSensor,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-SENSOR-TEMPERATURE',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        temperatureMeasurement: {
          measuredValue: 2100, // 21.00°C (in hundredths)
          minMeasuredValue: -5000,
          maxMeasuredValue: 10000,
        },
      },
    })

    this.logInfo('initialized.')
  }

  public async updateTemperature(celsius: number): Promise<void> {
    const value = Math.round(celsius * 100) // convert to hundredths
    await this.updateState('temperatureMeasurement', { measuredValue: value })
    this.logInfo(`temperature: ${celsius}°C.`)
  }
}
