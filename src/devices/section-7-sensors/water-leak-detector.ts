/**
 * Water Leak Detector Device (Matter Spec § 7.12)
 *
 * A sensor that detects the presence of water/leaks.
 */

import type { DeviceContext } from '../types.js'

export function registerWaterLeakDetector(context: DeviceContext): any[] {
  const { api, config } = context
  const accessories: any[] = []

  if (!config.enableLeakSensor) {
    return accessories
  }

  accessories.push({
    uuid: api.matter.uuid.generate('matter-leak-sensor'),
    displayName: 'Leak Sensor',
    deviceType: api.matter.deviceTypes.LeakSensor,
    serialNumber: 'LEAK-001',
    manufacturer: 'Homebridge',
    model: 'Leak Sensor Example',
    clusters: {
      booleanState: {
        stateValue: false, // No leak detected (false = dry, true = leak)
      },
    },
  })

  return accessories
}
