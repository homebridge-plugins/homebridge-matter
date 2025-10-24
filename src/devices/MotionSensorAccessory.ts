/**
 * Motion Sensor Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class MotionSensorAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'SENSOR-003'
    const OccupancySensingServer = api.matter.deviceTypes.MotionSensor.requirements.OccupancySensingServer
    const MotionSensorWithPIR = api.matter.deviceTypes.MotionSensor.with(
      OccupancySensingServer.with('PassiveInfrared'),
    )

    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
      displayName: 'Motion Sensor',
      deviceType: MotionSensorWithPIR,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-SENSOR-MOTION',
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

  public updateMotionDetected(detected: boolean): void {
    this.updateState('occupancySensing', {
      occupancy: { occupied: detected },
    })
    this.logInfo(`motion: ${detected ? 'detected' : 'clear'}.`)
  }
}
