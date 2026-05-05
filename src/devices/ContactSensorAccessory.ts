/**
 * Contact Sensor Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class ContactSensorAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-contact-sensor'
    const matter = getMatter(api)
    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'Contact Sensor',
      deviceType: matter.deviceTypes.ContactSensor,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-SENSOR-CONTACT',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        booleanState: {
          stateValue: true, // matter: true = closed/normal, false = open/triggered
        },
      },
    })

    this.logInfo('initialized.')
  }

  public async updateContactState(isOpen: boolean): Promise<void> {
    // Matter BooleanState: false = open/triggered, true = closed/normal (inverted!)
    await this.updateState(this.matter.clusterNames.BooleanState, { stateValue: !isOpen })
    this.logInfo(`contact state: ${isOpen ? 'OPEN' : 'CLOSED'}.`)
  }
}
