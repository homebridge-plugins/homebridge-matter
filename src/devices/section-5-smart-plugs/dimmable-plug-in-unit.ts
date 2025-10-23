/**
 * Dimmable Plug-in Unit Device (Matter Spec § 5.2)
 *
 * A plug-in unit with on/off and level control.
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - Multiple clusters (OnOff + LevelControl) for outlets
 * - Type-safe handlers with MatterRequests
 */

import type { MatterRequests } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerDimmablePlugInUnit(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  if (!config.enableDimmableOutlet) {
    return accessories
  }

  accessories.push({
    uuid: api.matter.uuid.generate('matter-dimmable-outlet'),
    displayName: 'Dimmable Outlet',
    deviceType: api.matter.deviceTypes.DimmableOutlet,
    serialNumber: 'OUTLET-002',
    manufacturer: 'Matter Examples',
    model: 'DimmableOutlet v1',

    clusters: {
      onOff: {
        onOff: false,
      },
      levelControl: {
        currentLevel: 127,
        minLevel: 1,
        maxLevel: 254,
      },
    },

    handlers: {
      onOff: {
        on: async () => {
          log.info('[Dimmable Outlet] Turning ON')
          // TODO: await myOutletAPI.turnOn()
        },

        off: async () => {
          log.info('[Dimmable Outlet] Turning OFF')
          // TODO: await myOutletAPI.turnOff()
        },
      },

      levelControl: {
        moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
          const { level } = request
          const brightnessPercent = Math.round((level / 254) * 100)
          log.info(`[Dimmable Outlet] Setting level to ${brightnessPercent}%`)

          // TODO: await myOutletAPI.setLevel(brightnessPercent)
        },
      },
    },
  })

  return accessories
}
