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
        // Fan mode using api.matter.types enum for type safety
        fanMode: api.matter.types.FanControl.FanMode.Off, // Initial state: Off

        // Fan mode sequence: defines which modes this fan supports
        // 0=OffLowMedHigh, 1=OffLowHigh, 2=OffLowMedHighAuto, 3=OffLowHighAuto, 4=OffOnAuto, 5=OffOn
        fanModeSequence: api.matter.types.FanControl.FanModeSequence.OffLowMedHigh, // Supports: Off, Low, Medium, High

        // Percent-based speed control (0-100)
        percentSetting: 0, // Target speed percentage
        percentCurrent: 0, // Current speed percentage

        // Alternative speed setting (0-100, some fans use this instead)
        speedSetting: 0,
        speedCurrent: 0,
      },
    },

    handlers: {
      fanControl: {
        // Called when user adjusts the speed slider
        setPercentSetting: async (request: { percentSetting: number }) => {
          log.info(`[Fan] ✓ Handler \`setPercentSetting\` called: ${request.percentSetting}%`)

          // TODO: Add your actual fan speed control logic here
          // Example: await myFanAPI.setSpeed(request.percentSetting)
        },

        // Called when user selects a specific mode (Off, Low, Medium, High, Auto, etc.)
        setFanMode: async (request: { fanMode: number }) => {
          const modes = ['Off', 'Low', 'Medium', 'High', 'On', 'Auto', 'Smart']
          const modeName = modes[request.fanMode] || `Unknown (${request.fanMode})`
          log.info(`[Fan] ✓ Handler \`setFanMode\` called: ${request.fanMode} (${modeName})`)

          // TODO: Add your actual fan mode control logic here
          // Example: await myFanAPI.setMode(modeName.toLowerCase())
        },

        // Called when user uses up/down buttons to increment/decrement speed
        step: async (request: { direction: number, wrap: boolean, lowestOff: boolean }) => {
          const dir = request.direction === 0 ? 'Up' : 'Down'
          log.info(`[Fan] ✓ Handler \`step\` called: direction=${dir}, wrap=${request.wrap}, lowestOff=${request.lowestOff}`)

          // TODO: Add your actual fan step control logic here
          // direction: 0 = increase speed, 1 = decrease speed
          // wrap: whether to wrap around from max to min (or vice versa)
          // lowestOff: whether the lowest speed setting should turn the fan off
        },
      },
    },
  })

  return accessories
}
