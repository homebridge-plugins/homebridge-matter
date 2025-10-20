/**
 * Extended Color Light Device (Matter Spec § 4.4)
 *
 * Handles both variants:
 * - Color Light (HS): Hue/Saturation only
 * - Extended Color Light (HS+CCT): Hue/Saturation + Color Temperature
 *
 * Both use the same Matter device type (ExtendedColorLight) but with different
 * cluster configurations.
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
          colorMode: 0, // Hue/Saturation mode
          currentHue: 0, // Red (0 degrees)
          currentSaturation: 254, // Full saturation
          currentX: 41942, // Also provide XY for compatibility
          currentY: 21626,
        },
      },

      handlers: {
        onOff: {
          on: async () => {
            log.info('[Colour Light HS] ✓ Handler `on` called (user controlled via Home app)')
          },
          off: async () => {
            log.info('[Colour Light HS] ✓ Handler `off` called (user controlled via Home app)')
          },
        },
        levelControl: {
          moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
            const { level } = request
            log.info(`[Colour Light HS] ✓ Handler \`moveToLevel\` called with ${level} (${Math.round(level / 254 * 100)}%)`)
          },
        },
        colorControl: {
          moveToColorLogic: async (request: { targetX: number, targetY: number, transitionTime: number }) => {
            const { targetX, targetY, transitionTime } = request
            const xFloat = (targetX / 65535).toFixed(4)
            const yFloat = (targetY / 65535).toFixed(4)
            log.info(`[Colour Light HS] ✓ Handler \`moveToColorLogic\` called with x=${targetX} (~${xFloat}), y=${targetY} (~${yFloat}), transition: ${transitionTime}s`)
          },
          moveToHueAndSaturationLogic: async (request: { targetHue: number, targetSaturation: number, transitionTime: number }) => {
            const { targetHue, targetSaturation, transitionTime } = request
            const hueDegrees = Math.round((targetHue / 254) * 360)
            const saturationPercent = Math.round((targetSaturation / 254) * 100)
            log.info(`[Colour Light HS] ✓ Handler \`moveToHueAndSaturationLogic\` called with hue=${targetHue} (~${hueDegrees}°), saturation=${targetSaturation} (~${saturationPercent}%), transition: ${transitionTime}s`)
          },
          // NOTE: No moveToColorTemperatureLogic handler - this variant only supports color, not CCT
        },
      },
    })
  }

  // Variant 2: Extended Color Light (HS + CCT)
  if (config.enableExtendedColourLight) {
    accessories.push({
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
          colorMode: 0, // Hue/Saturation mode
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
            log.info('[Extended Colour Light] ✓ Handler `on` called (user controlled via Home app)')
          },
          off: async () => {
            log.info('[Extended Colour Light] ✓ Handler `off` called (user controlled via Home app)')
          },
        },
        levelControl: {
          moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
            const { level } = request
            log.info(`[Extended Colour Light] ✓ Handler \`moveToLevel\` called with ${level} (${Math.round(level / 254 * 100)}%)`)
          },
        },
        colorControl: {
          moveToColorLogic: async (request: { targetX: number, targetY: number, transitionTime: number }) => {
            const { targetX, targetY, transitionTime } = request
            const xFloat = (targetX / 65535).toFixed(4)
            const yFloat = (targetY / 65535).toFixed(4)
            log.info(`[Extended Colour Light] ✓ Handler \`moveToColorLogic\` called with x=${targetX} (~${xFloat}), y=${targetY} (~${yFloat}), transition: ${transitionTime}s`)
          },
          moveToHueAndSaturationLogic: async (request: { targetHue: number, targetSaturation: number, transitionTime: number }) => {
            const { targetHue, targetSaturation, transitionTime } = request
            const hueDegrees = Math.round((targetHue / 254) * 360)
            const saturationPercent = Math.round((targetSaturation / 254) * 100)
            log.info(`[Extended Colour Light] ✓ Handler \`moveToHueAndSaturationLogic\` called with hue=${targetHue} (~${hueDegrees}°), saturation=${targetSaturation} (~${saturationPercent}%), transition: ${transitionTime}s`)
          },
          moveToColorTemperatureLogic: async (request: { targetMireds: number, transitionTime: number }) => {
            const { targetMireds, transitionTime } = request
            const kelvin = Math.round(1000000 / targetMireds)
            log.info(`[Extended Colour Light] ✓ Handler \`moveToColorTemperatureLogic\` called with ${targetMireds} mireds (~${kelvin}K), transition: ${transitionTime}s`)
          },
        },
      },
    })
  }

  return accessories
}
