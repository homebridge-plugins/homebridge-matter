/**
 * Light Sensor Device (Matter Spec § 7.2)
 *
 * A sensor that measures illuminance (light level).
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - IlluminanceMeasurement cluster for light sensors
 */

import type { DeviceContext } from '../types.js'

export function registerLightSensor(context: DeviceContext): any[] {
  const { api, config } = context
  const accessories: any[] = []

  if (!config.enableLightSensor) {
    return accessories
  }

  accessories.push({
    uuid: api.matter.uuid.generate('matter-light-sensor'),
    displayName: 'Light Sensor',
    deviceType: api.matter.deviceTypes.LightSensor,
    serialNumber: 'LIGHT-001',
    manufacturer: 'Homebridge',
    model: 'Light Sensor Example',
    clusters: {
      illuminanceMeasurement: {
        measuredValue: 5000, // 500 lux (in 10,000 * log10(lux) format)
        minMeasuredValue: 1,
        maxMeasuredValue: 65534,
      },
    },
  })

  return accessories
}
