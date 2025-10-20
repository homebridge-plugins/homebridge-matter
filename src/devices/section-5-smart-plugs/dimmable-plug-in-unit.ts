/**
 * Dimmable Plug-in Unit Device (Matter Spec § 5.2)
 *
 * A plug-in unit with on/off and level control.
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
          log.info('[Dimmable Outlet] ✓ Handler `on` called (user controlled via Home app)')
        },
        off: async () => {
          log.info('[Dimmable Outlet] ✓ Handler `off` called (user controlled via Home app)')
        },
      },
      levelControl: {
        moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
          const { level } = request
          log.info(`[Dimmable Outlet] ✓ Handler \`moveToLevel\` called with ${level} (${Math.round(level / 254 * 100)}%)`)
        },
      },
    },
  })

  return accessories
}
