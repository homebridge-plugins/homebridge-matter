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
          occupiedCoolingSetpoint: 2400,
          minHeatSetpointLimit: 700,
          maxHeatSetpointLimit: 3000,
          minCoolSetpointLimit: 1600,
          maxCoolSetpointLimit: 3200,
          controlSequenceOfOperation: 4, // Cooling and Heating
          systemMode: 0, // Off
        },
      },

      handlers: {
        thermostat: {
          setpointRaiseLower: async (request: MatterRequests.SetpointRaiseLower) =>
            this.handleSetpointRaiseLower(request),
          systemModeChange: async (request: { systemMode: number, oldSystemMode: number }) =>
            this.handleSystemModeChange(request),
          occupiedHeatingSetpointChange: async (request: { occupiedHeatingSetpoint: number, oldOccupiedHeatingSetpoint: number }) =>
            this.handleOccupiedHeatingSetpointChange(request),
          occupiedCoolingSetpointChange: async (request: { occupiedCoolingSetpoint: number, oldOccupiedCoolingSetpoint: number }) =>
            this.handleOccupiedCoolingSetpointChange(request),
        },
      },
    })

    this.logInfo('initialized.')
  }

  private async handleSetpointRaiseLower(request: MatterRequests.SetpointRaiseLower): Promise<void> {
    this.logInfo(`SetpointRaiseLower request: ${JSON.stringify(request)}`)
    const { mode, amount } = request
    const tempChange = amount / 10 // Convert from tenths to degrees
    this.logInfo((`adjusting setpoint by ${tempChange}°c (mode: ${mode}).`))
    // TODO: await myThermostatAPI.adjustSetpoint(mode, tempChange)
  }

  private async handleSystemModeChange(request: { systemMode: number, oldSystemMode: number }): Promise<void> {
    this.logInfo(`SystemMode change: ${JSON.stringify(request)}`)
    // Matter Thermostat SystemMode enum: 0=Off, 1=Auto, 3=Cool, 4=Heat, 5=EmergencyHeat, 6=Precooling, 7=FanOnly
    const modeNames = ['Off', 'Auto', 'Reserved', 'Cool', 'Heat', 'Emergency Heating', 'Precooling', 'Fan Only']
    const modeName = modeNames[request.systemMode] || `Unknown (${request.systemMode})`
    this.logInfo(`system mode changed to: ${modeName}.`)
    // TODO: await myThermostatAPI.setSystemMode(request.systemMode)
  }

  private async handleOccupiedHeatingSetpointChange(request: { occupiedHeatingSetpoint: number, oldOccupiedHeatingSetpoint: number }): Promise<void> {
    this.logInfo(`OccupiedHeatingSetpoint change: ${JSON.stringify(request)}`)
    const celsius = request.occupiedHeatingSetpoint / 100 // Convert from hundredths to degrees
    this.logInfo(`heating setpoint changed to: ${celsius}°C.`)
    // TODO: await myThermostatAPI.setHeatingSetpoint(celsius)
  }

  private async handleOccupiedCoolingSetpointChange(request: { occupiedCoolingSetpoint: number, oldOccupiedCoolingSetpoint: number }): Promise<void> {
    this.logInfo(`OccupiedCoolingSetpoint change: ${JSON.stringify(request)}`)
    const celsius = request.occupiedCoolingSetpoint / 100 // Convert from hundredths to degrees
    this.logInfo(`cooling setpoint changed to: ${celsius}°C.`)
    // TODO: await myThermostatAPI.setCoolingSetpoint(celsius)
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

  public updateCoolingSetpoint(celsius: number): void {
    const value = Math.round(celsius * 100)
    this.updateState('thermostat', { occupiedCoolingSetpoint: value })
    this.logInfo((`cooling setpoint: ${celsius}°c.`))
  }

  public updateSystemMode(mode: number): void {
    this.updateState('thermostat', { systemMode: mode })
  }
}
