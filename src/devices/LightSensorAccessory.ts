/**
 * Light Sensor Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class LightSensorAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-light-sensor'
    super(api, log, {
      UUID: api.matter.uuid.generate(serialNumber),
      displayName: 'Light Sensor',
      deviceType: api.matter.deviceTypes.LightSensor,
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
    const value = Math.round(10000 * Math.log10(lux))
    await this.updateState('illuminanceMeasurement', { measuredValue: value })
    this.logInfo(`illuminance: ${lux} lux.`)
  }
}
