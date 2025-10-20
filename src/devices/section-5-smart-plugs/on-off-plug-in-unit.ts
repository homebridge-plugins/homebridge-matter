/**
 * On/Off Plug-in Unit Device (Matter Spec § 5.1)
 *
 * A plug-in unit with on/off control (smart plug).
 */

import type { DeviceContext } from '../types.js'

export function registerOnOffPlugInUnit(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

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
          log.info('[On/Off Outlet] ✓ Handler `on` called (user controlled via Home app)')
        },
        off: async () => {
          log.info('[On/Off Outlet] ✓ Handler `off` called (user controlled via Home app)')
        },
      },
    },
  })

  return accessories
}
