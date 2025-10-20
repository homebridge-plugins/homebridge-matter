/**
 * Color Temperature Light Device (Matter Spec § 4.3)
 *
 * A lighting device with color temperature control.
 */

import type { MatterRequests } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerColorTemperatureLight(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  if (!config.enableColourTemperatureLight) {
    return accessories
  }

  accessories.push({
    uuid: api.matter.uuid.generate('matter-colour-temp-light'),
    displayName: 'Colour Temperature Light',
    deviceType: api.matter.deviceTypes.ColorTemperatureLight,
    serialNumber: 'LIGHT-003',
    manufacturer: 'Matter Examples',
    model: 'ColourTempLight v1',

    clusters: {
      onOff: {
        onOff: false,
      },
      levelControl: {
        currentLevel: 127,
        minLevel: 1,
        maxLevel: 254,
      },
      colorControl: {
        colorMode: 2, // Colour temperature mode
        colorTemperatureMireds: 250, // ~4000K
        colorTempPhysicalMinMireds: 147, // 6800K (coolest)
        colorTempPhysicalMaxMireds: 454, // 2200K (warmest)
        coupleColorTempToLevelMinMireds: 147,
      },
    },

    handlers: {
      onOff: {
        on: async () => {
          log.info('[Colour Temp Light] ✓ Handler `on` called (user controlled via Home app)')
        },
        off: async () => {
          log.info('[Colour Temp Light] ✓ Handler `off` called (user controlled via Home app)')
        },
      },
      levelControl: {
        moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
          const { level } = request
          log.info(`[Colour Temp Light] ✓ Handler \`moveToLevel\` called with ${level} (${Math.round(level / 254 * 100)}%)`)
        },
      },
      colorControl: {
        moveToColorTemperatureLogic: async (request: { targetMireds: number, transitionTime: number }) => {
          const { targetMireds, transitionTime } = request
          const kelvin = Math.round(1000000 / targetMireds)
          log.info(`[Colour Temp Light] ✓ Handler \`moveToColorTemperatureLogic\` called with ${targetMireds} mireds (~${kelvin}K), transition: ${transitionTime}s`)
        },
      },
    },
  })

  return accessories
}
