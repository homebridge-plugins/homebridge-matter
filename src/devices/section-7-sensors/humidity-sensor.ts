/**
 * Humidity Sensor Device (Matter Spec § 7.7)
 *
 * A sensor that measures relative humidity.
 */

import type { DeviceContext } from '../types.js'

export function registerHumiditySensor(context: DeviceContext): any[] {
  const { api, config } = context
  const accessories: any[] = []

  if (!config.enableHumiditySensor) {
    return accessories
  }

  accessories.push({
    uuid: api.hap.uuid.generate('matter-humidity-sensor'),
    displayName: 'Humidity Sensor',
    deviceType: api.matter.deviceTypes.HumiditySensor,
    serialNumber: 'HUM-001',
    manufacturer: 'Homebridge',
    model: 'Humidity Sensor Example',
    clusters: {
      relativeHumidityMeasurement: {
        measuredValue: 5500, // 55% (in hundredths of a percent)
        minMeasuredValue: 0,
        maxMeasuredValue: 10000, // 100%
      },
    },
  })

  return accessories
}
