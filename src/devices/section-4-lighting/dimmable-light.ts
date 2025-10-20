/**
 * Dimmable Light Device (Matter Spec § 4.2)
 *
 * A lighting device with on/off and level control (brightness).
 */

import type { MatterRequests } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerDimmableLight(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  if (!config.enableDimmableLight) {
    return accessories
  }

  accessories.push({
    uuid: api.matter.uuid.generate('matter-dimmable-light'),
    displayName: 'Dimmable Light',
    deviceType: api.matter.deviceTypes.DimmableLight,
    serialNumber: 'LIGHT-002',
    manufacturer: 'Matter Examples',
    model: 'DimmableLight v1',

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
          log.info('[Dimmable Light] ✓ Handler `on` called (user controlled via Home app)')
        },
        off: async () => {
          log.info('[Dimmable Light] ✓ Handler `off` called (user controlled via Home app)')
        },
      },
      levelControl: {
        moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
          const { level } = request
          log.info(`[Dimmable Light] ✓ Handler \`moveToLevel\` called with ${level} (${Math.round(level / 254 * 100)}%)`)
        },
      },
    },
  })

  return accessories
}
