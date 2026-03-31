/**
 * Leak Sensor Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class LeakSensorAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-leak-sensor'
    super(api, log, {
      UUID: api.matter.uuid.generate(serialNumber),
      displayName: 'Leak Sensor',
      deviceType: api.matter.deviceTypes.LeakSensor,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-SENSOR-LEAK',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        booleanState: {
          stateValue: false, // false = dry, true = leak
        },
      },
    })

    this.logInfo('initialized.')
  }

  public async updateLeakState(leakDetected: boolean): Promise<void> {
    await this.updateState(this.api.matter.clusterNames.BooleanState, { stateValue: leakDetected })
    this.logInfo(`leak: ${leakDetected ? 'detected' : 'none'}.`)
  }
}
