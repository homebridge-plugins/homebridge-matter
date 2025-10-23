/**
 * Fan Device (Matter Spec § 9.2)
 *
 * A fan with speed control and mode selection.
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - FanControl cluster with multiple control methods
 * - Using api.matter.types for fan modes and sequences
 * - Speed percentage and mode-based control
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
        fanMode: api.matter.types.FanControl.FanMode.Off,
        fanModeSequence: api.matter.types.FanControl.FanModeSequence.OffLowMedHigh,
        percentSetting: 0,
        percentCurrent: 0,
        speedSetting: 0,
        speedCurrent: 0,
      },
    },

    handlers: {
      fanControl: {
        setPercentSetting: async (request: { percentSetting: number }) => {
          log.info(`[Fan] Setting speed to ${request.percentSetting}%`)
          // TODO: await myFanAPI.setSpeed(request.percentSetting)
        },

        setFanMode: async (request: { fanMode: number }) => {
          const modes = ['Off', 'Low', 'Medium', 'High', 'On', 'Auto', 'Smart']
          const modeName = modes[request.fanMode] || `Unknown (${request.fanMode})`
          log.info(`[Fan] Setting mode to ${modeName}`)
          // TODO: await myFanAPI.setMode(modeName.toLowerCase())
        },

        step: async (request: { direction: number, wrap: boolean, lowestOff: boolean }) => {
          const dir = request.direction === 0 ? 'Up' : 'Down'
          log.info(`[Fan] Step ${dir}`)
          // TODO: await myFanAPI.step(request.direction, request.wrap, request.lowestOff)
        },
      },
    },
  })

  return accessories
}
