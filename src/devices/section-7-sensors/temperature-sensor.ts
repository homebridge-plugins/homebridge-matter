/**
 * Temperature Sensor Device (Matter Spec § 7.4)
 *
 * A sensor that measures ambient temperature.
 */

import type { DeviceContext } from '../types.js'

export function registerTemperatureSensor(context: DeviceContext): any[] {
  const { api, config } = context
  const accessories: any[] = []

  if (!config.enableTemperatureSensor) {
    return accessories
  }

  accessories.push({
    uuid: api.hap.uuid.generate('matter-temperature-sensor'),
    displayName: 'Temperature Sensor',
    deviceType: api.matter.deviceTypes.TemperatureSensor,
    serialNumber: 'TEMP-001',
    manufacturer: 'Homebridge',
    model: 'Temperature Sensor Example',
    clusters: {
      temperatureMeasurement: {
        measuredValue: 2100, // 21.00°C (in hundredths of a degree Celsius)
        minMeasuredValue: -5000, // -50°C
        maxMeasuredValue: 10000, // 100°C
      },
    },
  })

  return accessories
}
