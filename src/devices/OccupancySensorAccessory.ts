/**
 * Occupancy Sensor Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class OccupancySensorAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-occupancy-sensor'
    const matter = getMatter(api)

    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'Occupancy Sensor',
      // Note: Matter.js API calls this "MotionSensor" but it's actually an Occupancy Sensor.
      // Homebridge >= 2.1.2 ships the OccupancySensing cluster on this device type with the
      // PassiveInfrared detector type and the OccupancyEvent feature (automatic
      // OccupancyChanged events), and fills in the sensor-type attributes from the features.
      deviceType: matter.deviceTypes.MotionSensor,
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
        },
      },
    })

    this.logInfo('initialized.')
  }

  public async updateOccupancyDetected(detected: boolean): Promise<void> {
    await this.updateState('occupancySensing', {
      occupancy: { occupied: detected },
    })
    this.logInfo(`occupancy: ${detected ? 'detected' : 'clear'}.`)
  }
}
