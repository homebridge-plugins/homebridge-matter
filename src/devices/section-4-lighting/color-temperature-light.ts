/**
 * Color Temperature Light Device (Matter Spec § 4.3)
 *
 * A lighting device with color temperature control.
 */

import type { MatterRequests } from 'homebridge'

import { MatterTypes } from 'homebridge'

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
        onOff: false, // Initial state: off
      },
      levelControl: {
        currentLevel: 127, // Current brightness: 50% (range 1-254)
        minLevel: 1, // Minimum brightness
        maxLevel: 254, // Maximum brightness
      },
      colorControl: {
        colorMode: MatterTypes.ColorControl.ColorMode.ColorTemperatureMireds, // Color temperature mode
        colorTemperatureMireds: 250, // Current color temp: ~4000K (neutral white)
        colorTempPhysicalMinMireds: 147, // Coolest temp: 6800K (blue-ish white)
        colorTempPhysicalMaxMireds: 454, // Warmest temp: 2200K (orange-ish warm)
        coupleColorTempToLevelMinMireds: 147, // Optional: couples brightness to color temp
      },
    },

    handlers: {
      onOff: {
        on: async () => {
          log.info('[Colour Temp Light] ✓ Handler `on` called (user controlled via Home app)')

          // TODO: Add your actual light control logic here
          // Example: await myLightAPI.turnOn()
        },
        off: async () => {
          log.info('[Colour Temp Light] ✓ Handler `off` called (user controlled via Home app)')

          // TODO: Add your actual light control logic here
          // Example: await myLightAPI.turnOff()
        },
      },
      levelControl: {
        moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
          const { level } = request
          log.info(`[Colour Temp Light] ✓ Handler \`moveToLevel\` called with ${level} (${Math.round(level / 254 * 100)}%)`)

          // TODO: Add your actual brightness control logic here
          // Example: await myLightAPI.setBrightness(Math.round(level / 254 * 100))
        },
      },
      colorControl: {
        moveToColorTemperatureLogic: async (request: { targetMireds: number, transitionTime: number }) => {
          const { targetMireds, transitionTime } = request
          const kelvin = Math.round(1000000 / targetMireds)
          log.info(`[Colour Temp Light] ✓ Handler \`moveToColorTemperatureLogic\` called with ${targetMireds} mireds (~${kelvin}K), transition: ${transitionTime}s`)

          // TODO: Add your actual color temperature control logic here
          // Note: Convert mireds to Kelvin: kelvin = 1000000 / mireds
          // Example: await myLightAPI.setColorTemperature(kelvin)
        },
      },
    },
  })

  return accessories
}
