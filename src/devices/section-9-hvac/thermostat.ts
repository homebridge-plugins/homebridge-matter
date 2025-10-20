/**
 * Thermostat Device (Matter Spec § 9.1)
 *
 * A device for controlling heating and cooling systems.
 */

import { MatterTypes } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerThermostat(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  if (!config.enableThermostat) {
    return accessories
  }

  accessories.push({
    uuid: api.matter.uuid.generate('matter-thermostat'),
    displayName: 'Thermostat',
    deviceType: api.matter.deviceTypes.Thermostat,
    serialNumber: 'THERMO-001',
    manufacturer: 'Matter Examples',
    model: 'Thermostat v1',

    clusters: {
      thermostat: {
        // Current temperature (in hundredths of degrees Celsius)
        localTemperature: 2100, // 21.00°C (2100 / 100 = 21.0)

        // Heating setpoint (target temperature in heat mode)
        occupiedHeatingSetpoint: 2000, // Target: 20.00°C
        minHeatSetpointLimit: 700, // Minimum: 7°C
        maxHeatSetpointLimit: 3000, // Maximum: 30°C

        // Cooling setpoint (target temperature in cool mode)
        occupiedCoolingSetpoint: 2400, // Target: 24.00°C
        minCoolSetpointLimit: 1600, // Minimum: 16°C
        maxCoolSetpointLimit: 3200, // Maximum: 32°C

        // System mode using MatterTypes enum for type safety
        systemMode: MatterTypes.Thermostat.SystemMode.Heat, // Currently in Heat mode

        // Control sequence: defines what modes are available (mandatory)
        controlSequenceOfOperation: MatterTypes.Thermostat.ControlSequenceOfOperation.CoolingAndHeating,
      },
    },

    handlers: {
      thermostat: {
        // Called when user changes the heating target temperature
        setOccupiedHeatingSetpoint: async (request: { targetSetpoint: number }) => {
          const tempC = (request.targetSetpoint / 100).toFixed(1)
          log.info(`[Thermostat] ✓ Handler \`setOccupiedHeatingSetpoint\` called: ${request.targetSetpoint} (${tempC}°C)`)

          // TODO: Add your actual thermostat control logic here
          // Example: await myThermostatAPI.setHeatingTarget(parseFloat(tempC))
        },

        // Called when user changes the cooling target temperature
        setOccupiedCoolingSetpoint: async (request: { targetSetpoint: number }) => {
          const tempC = (request.targetSetpoint / 100).toFixed(1)
          log.info(`[Thermostat] ✓ Handler \`setOccupiedCoolingSetpoint\` called: ${request.targetSetpoint} (${tempC}°C)`)

          // TODO: Add your actual thermostat control logic here
          // Example: await myThermostatAPI.setCoolingTarget(parseFloat(tempC))
        },

        // Called when user changes the system mode (Off, Auto, Cool, Heat, etc.)
        setSystemMode: async (request: { systemMode: number }) => {
          const modes = ['Off', 'Auto', 'Reserved', 'Cool', 'Heat', 'Emergency Heating', 'Precooling', 'Fan Only']
          const modeName = modes[request.systemMode] || `Unknown (${request.systemMode})`
          log.info(`[Thermostat] ✓ Handler \`setSystemMode\` called: ${request.systemMode} (${modeName})`)

          // TODO: Add your actual thermostat mode control logic here
          // Example: await myThermostatAPI.setMode(modeName.toLowerCase())
        },
      },
    },
  })

  return accessories
}
