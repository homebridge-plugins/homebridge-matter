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
  const { api, log, config } = context
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
      onOff: {
        onOff: false,
      },
    },

    handlers: {
      onOff: {
        on: async () => {
          log.info('[On/Off Switch] Turning ON')
          // TODO: await mySwitchAPI.turnOn()
        },

        off: async () => {
          log.info('[On/Off Switch] Turning OFF')
          // TODO: await mySwitchAPI.turnOff()
        },
      },
    },
  })

  return accessories
}
