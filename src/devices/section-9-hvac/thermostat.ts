/**
 * Thermostat Device (Matter Spec § 9.1)
 *
 * A device for controlling heating and cooling systems.
 */

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
        localTemperature: 2100, // 21.00°C

        // Heating setpoint (target temperature in heat mode)
        occupiedHeatingSetpoint: 2000, // 20.00°C
        minHeatSetpointLimit: 700, // 7°C minimum
        maxHeatSetpointLimit: 3000, // 30°C maximum

        // Cooling setpoint (target temperature in cool mode)
        occupiedCoolingSetpoint: 2400, // 24.00°C
        minCoolSetpointLimit: 1600, // 16°C minimum
        maxCoolSetpointLimit: 3200, // 32°C maximum

        // System mode: 0=Off, 1=Auto, 3=Cool, 4=Heat
        systemMode: 4, // Heat mode

        // Control sequence: what modes are available (mandatory field)
        // 4 = CoolingAndHeating (correct value when both Heating & Cooling features are present)
        controlSequenceOfOperation: 4,
      },
    },

    handlers: {
      thermostat: {
        // Called when user changes heating setpoint
        setOccupiedHeatingSetpoint: async (request: { targetSetpoint: number }) => {
          const tempC = (request.targetSetpoint / 100).toFixed(1)
          log.info(`[Thermostat] ✓ Handler \`setOccupiedHeatingSetpoint\` called: ${request.targetSetpoint} (${tempC}°C)`)
        },

        // Called when user changes cooling setpoint
        setOccupiedCoolingSetpoint: async (request: { targetSetpoint: number }) => {
          const tempC = (request.targetSetpoint / 100).toFixed(1)
          log.info(`[Thermostat] ✓ Handler \`setOccupiedCoolingSetpoint\` called: ${request.targetSetpoint} (${tempC}°C)`)
        },

        // Called when user changes mode (Off, Auto, Cool, Heat)
        setSystemMode: async (request: { systemMode: number }) => {
          const modes = ['Off', 'Auto', 'Reserved', 'Cool', 'Heat', 'Emergency Heating', 'Precooling', 'Fan Only']
          const modeName = modes[request.systemMode] || `Unknown (${request.systemMode})`
          log.info(`[Thermostat] ✓ Handler \`setSystemMode\` called: ${request.systemMode} (${modeName})`)
        },
      },
    },
  })

  return accessories
}
