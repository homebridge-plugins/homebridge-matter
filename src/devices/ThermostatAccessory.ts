/**
 * Thermostat Accessory Class
 */

import type { API, Logger, MatterRequests } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class ThermostatAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'THERMOSTAT-001'
    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
      displayName: 'Thermostat',
      deviceType: api.matter.deviceTypes.Thermostat,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-THERMOSTAT',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        thermostat: {
          localTemperature: 2100, // 21.00°C
          occupiedHeatingSetpoint: 2000,
          minHeatSetpointLimit: 700,
          maxHeatSetpointLimit: 3000,
          controlSequenceOfOperation: 2, // Heating only
          systemMode: 4, // Heat
        },
      },

      handlers: {
        thermostat: {
          setpointRaiseLower: async (request: MatterRequests.SetpointRaiseLower) =>
            this.handleSetpointRaiseLower(request),
        },
      },
    })

    this.logInfo('initialized.')
  }

  private async handleSetpointRaiseLower(request: MatterRequests.SetpointRaiseLower): Promise<void> {
    const { mode, amount } = request
    const tempChange = amount / 10 // Convert from tenths to degrees
    this.logInfo((`adjusting setpoint by ${tempChange}°c (mode: ${mode}).`))
    // TODO: await myThermostatAPI.adjustSetpoint(mode, tempChange)
  }

  public updateCurrentTemperature(celsius: number): void {
    const value = Math.round(celsius * 100)
    this.updateState('thermostat', { localTemperature: value })
    this.logInfo((`current temperature: ${celsius}°c.`))
  }

  public updateHeatingSetpoint(celsius: number): void {
    const value = Math.round(celsius * 100)
    this.updateState('thermostat', { occupiedHeatingSetpoint: value })
    this.logInfo((`heating setpoint: ${celsius}°c.`))
  }

  public updateSystemMode(mode: number): void {
    this.updateState('thermostat', { systemMode: mode })
  }
}
