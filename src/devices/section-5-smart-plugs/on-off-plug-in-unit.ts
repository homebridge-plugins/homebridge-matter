/**
 * On/Off Plug-in Unit Device (Matter Spec § 5.1)
 *
 * A plug-in unit with on/off control (smart plug).
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - Basic OnOff cluster implementation for outlets
 */

import type { MatterAccessory } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerOnOffPlugInUnit(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: MatterAccessory[] = []

  if (!config.enableOnOffOutlet) {
    return accessories
  }

  accessories.push({
    uuid: api.matter.uuid.generate('matter-onoff-outlet'),
    displayName: 'On/Off Outlet',
    deviceType: api.matter.deviceTypes.OnOffOutlet,
    serialNumber: 'OUTLET-001',
    manufacturer: 'Matter Examples',
    model: 'OnOffOutlet v1',

    clusters: {
      onOff: {
        onOff: false,
      },
    },

    handlers: {
      onOff: {
        on: async () => {
          log.info('[On/Off Outlet] Turning ON')
          // TODO: await myOutletAPI.turnOn()
        },

        off: async () => {
          log.info('[On/Off Outlet] Turning OFF')
          // TODO: await myOutletAPI.turnOff()
        },
      },
    },
  })

  return accessories
}
