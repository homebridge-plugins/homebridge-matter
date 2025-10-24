/**
 * Humidity Sensor Device (Matter Spec § 7.7)
 *
 * A sensor that measures relative humidity.
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - RelativeHumidityMeasurement cluster for humidity sensors
 */

import type { MatterAccessory } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerHumiditySensor(context: DeviceContext): any[] {
  const { api, config } = context
  const accessories: MatterAccessory[] = []

  if (!config.enableHumiditySensor) {
    return accessories
  }

  accessories.push({
    uuid: api.matter.uuid.generate('matter-humidity-sensor'),
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
