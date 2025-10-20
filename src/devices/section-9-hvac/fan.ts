/**
 * Fan Device (Matter Spec § 9.2)
 *
 * A fan with speed control and mode selection.
 */

import type { DeviceContext } from '../types.js'

export function registerFan(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  if (!config.enableFan) {
    return accessories
  }

  accessories.push({
    uuid: api.matter.uuid.generate('matter-fan'),
    displayName: 'Fan',
    deviceType: api.matter.deviceTypes.Fan,
    serialNumber: 'FAN-001',
    manufacturer: 'Matter Examples',
    model: 'Fan v1',

    clusters: {
      fanControl: {
        // Fan mode: 0=Off, 1=Low, 2=Medium, 3=High, 4=On, 5=Auto, 6=Smart
        fanMode: 0, // Off

        // Fan mode sequence: indicates which modes are supported
        // 0=OffLowMedHigh, 1=OffLowHigh, 2=OffLowMedHighAuto, 3=OffLowHighAuto, 4=OffOnAuto, 5=OffOn
        fanModeSequence: 0, // OffLowMedHigh

        // Percent setting (0-100)
        percentSetting: 0,
        percentCurrent: 0,

        // Speed setting (0-100, some fans use this instead of percent)
        speedSetting: 0,
        speedCurrent: 0,
      },
    },

    handlers: {
      fanControl: {
        // Called when user changes fan speed via percent slider
        setPercentSetting: async (request: { percentSetting: number }) => {
          log.info(`[Fan] ✓ Handler \`setPercentSetting\` called: ${request.percentSetting}%`)
        },

        // Called when user changes fan mode
        setFanMode: async (request: { fanMode: number }) => {
          const modes = ['Off', 'Low', 'Medium', 'High', 'On', 'Auto', 'Smart']
          const modeName = modes[request.fanMode] || `Unknown (${request.fanMode})`
          log.info(`[Fan] ✓ Handler \`setFanMode\` called: ${request.fanMode} (${modeName})`)
        },

        // Called when user presses up/down buttons to adjust speed
        step: async (request: { direction: number, wrap: boolean, lowestOff: boolean }) => {
          const dir = request.direction === 0 ? 'Up' : 'Down'
          log.info(`[Fan] ✓ Handler \`step\` called: direction=${dir}, wrap=${request.wrap}, lowestOff=${request.lowestOff}`)
        },
      },
    },
  })

  return accessories
}
