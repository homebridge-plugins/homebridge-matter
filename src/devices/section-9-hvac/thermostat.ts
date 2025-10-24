/**
 * Thermostat Device (Matter Spec § 9.1)
 *
 * A device for controlling heating and cooling systems.
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - Thermostat cluster with heating/cooling setpoints
 * - Using api.matter.types for system modes
 * - Temperature in hundredths of degrees Celsius
 */

import type { MatterAccessory } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerThermostat(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: MatterAccessory[] = []

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
        localTemperature: 2100, // 21.00°C
        occupiedHeatingSetpoint: 2000, // 20.00°C
        minHeatSetpointLimit: 700,
        maxHeatSetpointLimit: 3000,
        occupiedCoolingSetpoint: 2400, // 24.00°C
        minCoolSetpointLimit: 1600,
        maxCoolSetpointLimit: 3200,
        systemMode: api.matter.types.Thermostat.SystemMode.Heat,
        controlSequenceOfOperation: api.matter.types.Thermostat.ControlSequenceOfOperation.CoolingAndHeating,
      },
    },

    handlers: {
      thermostat: {
        setOccupiedHeatingSetpoint: async (request: { targetSetpoint: number }) => {
          const tempC = (request.targetSetpoint / 100).toFixed(1)
          log.info(`[Thermostat] Setting heating target to ${tempC}°C`)
          // TODO: await myThermostatAPI.setHeatingTarget(parseFloat(tempC))
        },

        setOccupiedCoolingSetpoint: async (request: { targetSetpoint: number }) => {
          const tempC = (request.targetSetpoint / 100).toFixed(1)
          log.info(`[Thermostat] Setting cooling target to ${tempC}°C`)
          // TODO: await myThermostatAPI.setCoolingTarget(parseFloat(tempC))
        },

        setSystemMode: async (request: { systemMode: number }) => {
          const modes = ['Off', 'Auto', 'Reserved', 'Cool', 'Heat', 'Emergency Heating', 'Precooling', 'Fan Only']
          const modeName = modes[request.systemMode] || `Unknown (${request.systemMode})`
          log.info(`[Thermostat] Setting mode to ${modeName}`)
          // TODO: await myThermostatAPI.setMode(modeName.toLowerCase())
        },
      },
    },
  })

  return accessories
}
