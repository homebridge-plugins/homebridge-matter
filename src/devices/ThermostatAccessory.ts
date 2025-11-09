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
          externalMeasuredIndoorTemperature: 2100, // 21.00°C
          occupiedHeatingSetpoint: 2000, // 20.00°C
          occupiedCoolingSetpoint: 2400, // 24.00°C
          unoccupiedHeatingSetpoint: 1800, // 18.00°C
          unoccupiedCoolingSetpoint: 2600, // 26.00°C
          minHeatSetpointLimit: 700, // 7.00°C
          maxHeatSetpointLimit: 3000, // 30.00°C
          minCoolSetpointLimit: 1600, // 16.00°C
          maxCoolSetpointLimit: 3200, // 32.00°C
          minSetpointDeadBand: 25, // 2.5°C minimum difference between heat/cool setpoints (required for Auto mode)
          controlSequenceOfOperation: 4, // cooling and heating
          systemMode: 1, // auto mode (0=off, 1=auto, 3=cool, 4=heat)
          occupancy: { occupied: true }, // default to occupied state
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
    const tempChange = amount / 10 // convert from tenths to degrees
    this.logInfo(`adjusting setpoint by ${tempChange}°C (mode: ${mode}).`)
    // TODO: await myThermostatAPI.adjustSetpoint(mode, tempChange)
  }

  private async handleSystemModeChange(request: { systemMode: number, oldSystemMode: number }): Promise<void> {
    this.logInfo(`SystemMode change: ${JSON.stringify(request)}`)
    // Matter Thermostat SystemMode enum: 0=Off, 1=Auto, 3=Cool, 4=Heat, 5=EmergencyHeat, 6=Precooling, 7=FanOnly
    const modeNames = ['Off', 'Auto', 'Reserved', 'Cool', 'Heat', 'Emergency Heating', 'Precooling', 'Fan Only']
    const modeName = modeNames[request.systemMode] || `Unknown (${request.systemMode})`
    this.logInfo(`system mode changed to: ${modeName}.`)

    // Example: Check if requested mode is supported by device
    // const supportedModes = [0, 3, 4] // Off, Cool, Heat
    // if (!supportedModes.includes(request.systemMode)) {
    //   throw new MatterStatus.InvalidAction(
    //     `System mode ${modeName} is not supported by this device`
    //   )
    // }

    // Example: Check if mode change is allowed based on external conditions
    // if (request.systemMode === 4 && this.outdoorTemp > 30) {
    //   throw new MatterStatus.InvalidInState(
    //     'Heating mode disabled when outdoor temperature exceeds 30°C'
    //   )
    // }

    // TODO: await myThermostatAPI.setSystemMode(request.systemMode)
  }

  private async handleOccupiedHeatingSetpointChange(request: { occupiedHeatingSetpoint: number, oldOccupiedHeatingSetpoint: number }): Promise<void> {
    this.logInfo(`OccupiedHeatingSetpoint change: ${JSON.stringify(request)}`)
    const celsius = request.occupiedHeatingSetpoint / 100 // convert from hundredths to degrees
    this.logInfo(`heating setpoint changed to: ${celsius}°C.`)

    // Example: Validate temperature is within device limits
    // const minTemp = 7 // 7°C
    // const maxTemp = 30 // 30°C
    // if (celsius < minTemp || celsius > maxTemp) {
    //   throw new MatterStatus.ConstraintError(
    //     `Heating setpoint ${celsius}°C is out of range (${minTemp}-${maxTemp}°C)`
    //   )
    // }

    // Example: Ensure heating setpoint is below cooling setpoint
    // if (celsius >= this.coolingSetpoint) {
    //   throw new MatterStatus.ConstraintError(
    //     `Heating setpoint must be below cooling setpoint (${this.coolingSetpoint}°C)`
    //   )
    // }

    // Example: Check if heating is supported
    // if (!this.supportsHeating) {
    //   throw new MatterStatus.InvalidInState('Device does not support heating mode')
    // }

    // TODO: await myThermostatAPI.setHeatingSetpoint(celsius)
  }

  private async handleOccupiedCoolingSetpointChange(request: { occupiedCoolingSetpoint: number, oldOccupiedCoolingSetpoint: number }): Promise<void> {
    this.logInfo(`OccupiedCoolingSetpoint change: ${JSON.stringify(request)}`)
    const celsius = request.occupiedCoolingSetpoint / 100 // convert from hundredths to degrees
    this.logInfo(`cooling setpoint changed to: ${celsius}°C.`)
    // TODO: await myThermostatAPI.setCoolingSetpoint(celsius)
  }

  public async updateCurrentTemperature(celsius: number): Promise<void> {
    const value = Math.round(celsius * 100)
    await this.updateState('thermostat', { externalMeasuredIndoorTemperature: value })
    this.logInfo(`current temperature: ${celsius}°C.`)
  }

  public async updateHeatingSetpoint(celsius: number): Promise<void> {
    const value = Math.round(celsius * 100)
    await this.updateState('thermostat', { occupiedHeatingSetpoint: value })
    this.logInfo(`heating setpoint: ${celsius}°C.`)
  }

  public async updateCoolingSetpoint(celsius: number): Promise<void> {
    const value = Math.round(celsius * 100)
    await this.updateState('thermostat', { occupiedCoolingSetpoint: value })
    this.logInfo(`cooling setpoint: ${celsius}°C.`)
  }

  public async updateSystemMode(mode: number): Promise<void> {
    await this.updateState('thermostat', { systemMode: mode })
  }

  public async updateOccupancy(occupied: boolean): Promise<void> {
    await this.updateState('thermostat', { occupancy: { occupied } })
    this.logInfo(`occupancy: ${occupied ? 'occupied' : 'unoccupied'}.`)
  }

  public async updateUnoccupiedSetpoints(heating: number, cooling: number): Promise<void> {
    const heatingValue = Math.round(heating * 100)
    const coolingValue = Math.round(cooling * 100)
    await this.updateState('thermostat', {
      unoccupiedHeatingSetpoint: heatingValue,
      unoccupiedCoolingSetpoint: coolingValue,
    })
    this.logInfo(`unoccupied setpoints - heat: ${heating}°C, cool: ${cooling}°C.`)
  }
}
