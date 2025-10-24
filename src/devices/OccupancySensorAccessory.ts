/**
 * Occupancy Sensor Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class OccupancySensorAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'SENSOR-003'
    // Note: Matter.js API calls this "MotionSensor" but it's actually an Occupancy Sensor
    const OccupancySensingServer = api.matter.deviceTypes.MotionSensor.requirements.OccupancySensingServer
    const OccupancySensorWithPIR = api.matter.deviceTypes.MotionSensor.with(
      OccupancySensingServer.with('PassiveInfrared'),
    )

    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
      displayName: 'Occupancy Sensor',
      deviceType: OccupancySensorWithPIR,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-SENSOR-OCCUPANCY',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        occupancySensing: {
          occupancy: {
            occupied: false,
          },
          occupancySensorType: 0,
          occupancySensorTypeBitmap: {
            pir: true,
            ultrasonic: false,
            physicalContact: false,
          },
        },
      },
    })

    this.logInfo('initialized.')
  }

  public updateOccupancyDetected(detected: boolean): void {
    this.updateState('occupancySensing', {
      occupancy: { occupied: detected },
    })
    this.logInfo(`occupancy: ${detected ? 'detected' : 'clear'}.`)
  }
}
