/**
 * On/Off Light Switch Device (Matter Spec § 6.1)
 *
 * A switch for controlling on/off lights.
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - Switch device implementation (input device, sends commands)
 */

import type { DeviceContext } from '../types.js'

export function registerOnOffLightSwitch(context: DeviceContext): any[] {
  const { api, config } = context
  const accessories: any[] = []

  if (!config.enableOnOffSwitch) {
    return accessories
  }

  accessories.push({
    uuid: api.matter.uuid.generate('matter-onoff-switch'),
    displayName: 'On/Off Switch',
    deviceType: api.matter.deviceTypes.OnOffSwitch,
    serialNumber: 'SWITCH-001',
    manufacturer: 'Matter Examples',
    model: 'OnOffSwitch v1',

    clusters: {
      // Switches are input devices - they send commands rather than expose state
      // The switch cluster configuration depends on the specific implementation
    },

    handlers: {
      // Switch handlers depend on the specific switch implementation
      // Typically, switches trigger events rather than respond to commands
    },
  })

  return accessories
}
