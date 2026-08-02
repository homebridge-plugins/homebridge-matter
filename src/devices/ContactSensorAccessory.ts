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

        // Battery. `powerSource` is a general utility cluster, not something
        // specific to any one device type, so it can be added to any accessory
        // that runs on batteries. Note this accessory declares no handlers at
        // all - a contact sensor is read-only - and the battery is still
        // exposed. Requires homebridge v2.3.0 or later on non-vacuum devices.
        powerSource: {
          status: 0, // 0 = Active
          order: 0, // Primary power source
          description: 'Battery',
          batPercentRemaining: 150, // 0-200, where 200 = 100% (0.5% increments), so 75%
          batChargeLevel: 0, // 0 = Ok, 1 = Warning, 2 = Critical
          batReplaceability: 2, // 0 = Unspecified, 1 = Not replaceable, 2 = User replaceable
          batReplacementNeeded: false,
        },
        // `batChargeState` is deliberately not declared here, but from
        // homebridge v2.3.0 every battery power source carries the Rechargeable
        // feature anyway, seeded with a charge state of Unknown. Omitting the
        // attribute no longer keeps a battery non-rechargeable - so a plugin
        // that does know its device is rechargeable should declare a real
        // charge state and keep it updated, and one that does not can leave it
        // alone. Homebridge accepts a late first report either way, which is
        // the point of the seed (homebridge#3982).
      },
    })

    this.logInfo('initialized.')
  }

  /**
   * Update the battery level
   *
   * Real plugins should call this when their device reports a new battery
   * reading, rather than on a timer - this example leaves the level static.
   *
   * @param percentage - Battery percentage (0-100)
   */
  public async updateBatteryPercentage(percentage: number): Promise<void> {
    // Matter stores this in half-percent steps: 0-200, where 200 = 100%
    const batPercentRemaining = Math.max(0, Math.min(200, Math.round(percentage * 2)))

    let batChargeLevel = 0 // Ok
    if (percentage < 20) {
      batChargeLevel = 2 // Critical
    } else if (percentage < 40) {
      batChargeLevel = 1 // Warning
    }

    await this.updateState('powerSource', { batPercentRemaining, batChargeLevel })
    this.logInfo(`battery: ${percentage}%.`)
  }

  public async updateContactState(isOpen: boolean): Promise<void> {
    // Matter BooleanState: false = open/triggered, true = closed/normal (inverted!)
    await this.updateState(this.matter.clusterNames.BooleanState, { stateValue: !isOpen })
    this.logInfo(`contact state: ${isOpen ? 'OPEN' : 'CLOSED'}.`)
  }
}
