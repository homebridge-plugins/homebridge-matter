/**
 * Contact Sensor Device (Matter Spec § 7.1)
 *
 * A sensor that detects open/close state (e.g., door, window).
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - BooleanState cluster for binary sensors
 */

import type { MatterAccessory } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerContactSensor(context: DeviceContext): any[] {
  const { api, config } = context
  const accessories: MatterAccessory[] = []

  if (!config.enableContactSensor) {
    return accessories
  }

  accessories.push({
    uuid: api.matter.uuid.generate('matter-contact-sensor'),
    displayName: 'Contact Sensor',
    deviceType: api.matter.deviceTypes.ContactSensor,
    serialNumber: 'CONTACT-001',
    manufacturer: 'Homebridge',
    model: 'Contact Sensor Example',
    clusters: {
      booleanState: {
        stateValue: false, // Contact closed (false = closed, true = open)
      },
    },
  })

  return accessories
}
