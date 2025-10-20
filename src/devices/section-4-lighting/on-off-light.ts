/**
 * On/Off Light Device (Matter Spec § 4.1)
 *
 * The On/Off Light is a lighting device that is capable of being switched on or off.
 */

import type { DeviceContext } from '../types.js'

export function registerOnOffLight(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  if (!config.enableOnOffLight) {
    return accessories
  }

  accessories.push({
    uuid: api.matter.uuid.generate('matter-onoff-light'),
    displayName: 'On/Off Light',
    deviceType: api.matter.deviceTypes.OnOffLight,
    serialNumber: 'LIGHT-001',
    manufacturer: 'Matter Examples',
    model: 'OnOffLight v1',

    clusters: {
      onOff: {
        onOff: true,
      },
    },

    handlers: {
      onOff: {
        on: async () => {
          log.info('[On/Off Light] ✓ Handler `on` called (user controlled via Home app)')
        },
        off: async () => {
          log.info('[On/Off Light] ✓ Handler `off` called (user controlled via Home app)')
        },
      },
    },
  })

  return accessories
}
