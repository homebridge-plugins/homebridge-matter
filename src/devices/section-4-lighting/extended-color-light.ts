/**
 * Extended Color Light Device (Matter Spec § 4.4)
 *
 * Handles both variants:
 * - Color Light (HS): Hue/Saturation only
 * - Extended Color Light (HS+CCT): Hue/Saturation + Color Temperature
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - Multiple color modes (HS, XY, Color Temperature)
 * - Color value conversions (hue/saturation, mireds/Kelvin, XY)
 * - Type-safe handlers with MatterRequests
 * - Most complex lighting scenario with mode switching
 */

import type { MatterRequests } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerExtendedColorLight(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  // Variant 1: Color Light (HS only - no CCT)
  if (config.enableColourLight) {
    accessories.push({
      uuid: api.matter.uuid.generate('matter-colour-light'),
      displayName: 'Colour Light (HS)',
      deviceType: api.matter.deviceTypes.ExtendedColorLight,
      serialNumber: 'LIGHT-004',
      manufacturer: 'Matter Examples',
      model: 'ColorLight v1',

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
          colorMode: api.matter.types.ColorControl.ColorMode.CurrentHueAndCurrentSaturation, // Hue/Saturation mode
          currentHue: 0, // Red (0 degrees)
          currentSaturation: 254, // Full saturation
          currentX: 41942, // Also provide XY for compatibility
          currentY: 21626,
        },
      },

      handlers: {
        onOff: {
          on: async () => {
            log.info('[Colour Light HS] Turning ON')
            // TODO: await myLightAPI.turnOn()
          },

          off: async () => {
            log.info('[Colour Light HS] Turning OFF')
            // TODO: await myLightAPI.turnOff()
          },
        },

        levelControl: {
          moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
            const { level } = request
            const brightnessPercent = Math.round((level / 254) * 100)
            log.info(`[Colour Light HS] Setting brightness to ${brightnessPercent}%`)

            // TODO: await myLightAPI.setBrightness(brightnessPercent)
          },
        },

        colorControl: {
          moveToColorLogic: async (request: { targetX: number, targetY: number, transitionTime: number }) => {
            const { targetX, targetY, transitionTime } = request
            const xFloat = (targetX / 65535).toFixed(4)
            const yFloat = (targetY / 65535).toFixed(4)
            log.info(`[Colour Light HS] Setting XY color to (${xFloat}, ${yFloat})`)

            // TODO: await myLightAPI.setXY(xFloat, yFloat, transitionTime)
          },

          moveToHueAndSaturationLogic: async (request: { targetHue: number, targetSaturation: number, transitionTime: number }) => {
            const { targetHue, targetSaturation, transitionTime } = request
            const hueDegrees = Math.round((targetHue / 254) * 360)
            const saturationPercent = Math.round((targetSaturation / 254) * 100)
            log.info(`[Colour Light HS] Setting color to ${hueDegrees}°, ${saturationPercent}%`)

            // TODO: await myLightAPI.setColor(hueDegrees, saturationPercent, transitionTime)
          },
          // NOTE: No moveToColorTemperatureLogic - this variant only supports color, not CCT
        },
      },
    })
  }

  // Variant 2: Extended Color Light (HS + CCT)
  // Supports both color (Hue/Saturation or XY) and white (Color Temperature) modes
  if (config.enableExtendedColourLight) {
    const accessory = {
      uuid: api.matter.uuid.generate('matter-extended-colour-light'),
      displayName: 'Extended Colour Light (HS+CCT)',
      deviceType: api.matter.deviceTypes.ExtendedColorLight,
      serialNumber: 'LIGHT-005',
      manufacturer: 'Matter Examples',
      model: 'ExtendedColorLight v1',

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
          colorMode: api.matter.types.ColorControl.ColorMode.CurrentHueAndCurrentSaturation, // Hue/Saturation mode
          currentHue: 0, // Red (0 degrees)
          currentSaturation: 254, // Full saturation
          currentX: 41942, // Also provide XY for compatibility
          currentY: 21626,
          colorTemperatureMireds: 250, // ~4000K (for CCT mode)
          colorTempPhysicalMinMireds: 147, // 6800K (coolest)
          colorTempPhysicalMaxMireds: 454, // 2200K (warmest)
          coupleColorTempToLevelMinMireds: 147,
        },
      },

      handlers: {
        onOff: {
          on: async () => {
            log.info('[Extended Colour Light] Turning ON')
            // TODO: await myLightAPI.turnOn()
          },

          off: async () => {
            log.info('[Extended Colour Light] Turning OFF')
            // TODO: await myLightAPI.turnOff()
          },
        },

        levelControl: {
          moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
            const { level } = request
            const brightnessPercent = Math.round((level / 254) * 100)
            log.info(`[Extended Colour Light] Setting brightness to ${brightnessPercent}%`)

            // TODO: await myLightAPI.setBrightness(brightnessPercent)
          },
        },

        colorControl: {
          moveToColorLogic: async (request: { targetX: number, targetY: number, transitionTime: number }) => {
            const { targetX, targetY, transitionTime } = request
            const xFloat = (targetX / 65535).toFixed(4)
            const yFloat = (targetY / 65535).toFixed(4)
            log.info(`[Extended Colour Light] Setting XY color to (${xFloat}, ${yFloat})`)

            // TODO: await myLightAPI.setXY(xFloat, yFloat, transitionTime)
          },

          moveToHueAndSaturationLogic: async (request: { targetHue: number, targetSaturation: number, transitionTime: number }) => {
            const { targetHue, targetSaturation, transitionTime } = request
            const hueDegrees = Math.round((targetHue / 254) * 360)
            const saturationPercent = Math.round((targetSaturation / 254) * 100)
            log.info(`[Extended Colour Light] Setting color to ${hueDegrees}°, ${saturationPercent}%`)

            // TODO: await myLightAPI.setColor(hueDegrees, saturationPercent, transitionTime)
          },

          moveToColorTemperatureLogic: async (request: { targetMireds: number, transitionTime: number }) => {
            const { targetMireds, transitionTime } = request
            const kelvin = Math.round(1000000 / targetMireds)
            log.info(`[Extended Colour Light] Setting color temp to ${kelvin}K`)

            // TODO: await myLightAPI.setColorTemperature(kelvin, transitionTime)
          },
        },
      },
    }

    accessories.push(accessory)
  }

  return accessories
}
