/**
 * Color Temperature Light Device (Matter Spec § 4.3)
 *
 * A lighting device with on/off, brightness, and color temperature control.
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - Multiple clusters (OnOff + LevelControl + ColorControl)
 * - Color temperature conversion (mireds ↔ Kelvin)
 * - Type-safe handlers with MatterRequests
 */

import type { MatterAccessory, MatterRequests } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerColorTemperatureLight(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: MatterAccessory[] = []

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
        currentLevel: 127, // 50% brightness (range 1-254)
        minLevel: 1,
        maxLevel: 254,
      },
      colorControl: {
        colorMode: api.matter.types.ColorControl.ColorMode.ColorTemperatureMireds,
        colorTemperatureMireds: 250, // ~4000K (neutral white)
        colorTempPhysicalMinMireds: 147, // 6800K (coolest)
        colorTempPhysicalMaxMireds: 454, // 2200K (warmest)
        coupleColorTempToLevelMinMireds: 147,
      },
    },

    handlers: {
      onOff: {
        on: async () => {
          log.info('[Colour Temp Light] Turning ON')
          // TODO: await myLightAPI.turnOn()
        },

        off: async () => {
          log.info('[Colour Temp Light] Turning OFF')
          // TODO: await myLightAPI.turnOff()
        },
      },

      levelControl: {
        moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
          const { level } = request
          const brightnessPercent = Math.round((level / 254) * 100)
          log.info(`[Colour Temp Light] Setting brightness to ${brightnessPercent}% (level: ${level})`)

          // TODO: await myLightAPI.setBrightness(brightnessPercent)
        },
      },

      colorControl: {
        moveToColorTemperatureLogic: async (request: MatterRequests.MoveToColorTemperature) => {
          const { colorTemperatureMireds, transitionTime } = request

          // Convert mireds to Kelvin: kelvin = 1000000 / mireds
          const kelvin = Math.round(1000000 / colorTemperatureMireds)
          log.info(`[Colour Temp Light] Setting color temp to ${kelvin}K (${colorTemperatureMireds} mireds)`)

          // TODO: await myLightAPI.setColorTemperature(kelvin, transitionTime)
        },
      },
    },
  })

  return accessories
}
