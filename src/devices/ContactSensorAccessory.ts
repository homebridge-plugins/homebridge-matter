/**
 * Contact Sensor Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class ContactSensorAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'SENSOR-001'
    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
      displayName: 'Contact Sensor',
      deviceType: api.matter.deviceTypes.ContactSensor,
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

  public updateContactState(isOpen: boolean): void {
    // Matter BooleanState: false = open/triggered, true = closed/normal (inverted!)
    this.updateState(this.api.matter.clusterNames.BooleanState, { stateValue: !isOpen })
    this.logInfo(`contact state: ${isOpen ? 'OPEN' : 'CLOSED'}.`)
  }
}
