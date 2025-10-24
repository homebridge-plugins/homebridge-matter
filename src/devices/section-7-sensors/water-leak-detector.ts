/**
 * Water Leak Detector Device (Matter Spec § 7.12)
 *
 * A sensor that detects the presence of water/leaks.
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - BooleanState cluster for leak detection
 */

import type { MatterAccessory } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerWaterLeakDetector(context: DeviceContext): any[] {
  const { api, config } = context
  const accessories: MatterAccessory[] = []

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
