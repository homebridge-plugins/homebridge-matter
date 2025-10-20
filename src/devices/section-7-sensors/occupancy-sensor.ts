/**
 * Occupancy Sensor Device (Matter Spec § 7.3)
 *
 * A sensor that detects occupancy/motion using various sensing methods.
 * This implementation uses Passive Infrared (PIR) detection.
 */

import type { DeviceContext } from '../types.js'

export function registerOccupancySensor(context: DeviceContext): any[] {
  const { api, config } = context
  const accessories: any[] = []

  if (!config.enableMotionSensor) {
    return accessories
  }

  // OccupancySensorDevice requires specifying features (PIR, Ultrasonic, or PhysicalContact)
  const OccupancySensingServer = api.matter.deviceTypes.MotionSensor.requirements.OccupancySensingServer
  const MotionSensorWithPIR = api.matter.deviceTypes.MotionSensor.with(
    OccupancySensingServer.with('PassiveInfrared'),
  )

  accessories.push({
    uuid: api.hap.uuid.generate('matter-motion-sensor'),
    displayName: 'Motion Sensor',
    deviceType: MotionSensorWithPIR,
    serialNumber: 'MOTION-001',
    manufacturer: 'Homebridge',
    model: 'Motion Sensor Example',
    clusters: {
      occupancySensing: {
        occupancy: {
          occupied: false, // No motion detected
        },
      },
    },
  })

  return accessories
}
