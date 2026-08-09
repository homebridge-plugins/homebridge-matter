/**
 * Thermostat Accessory Class
 */

import type { API, Logger, MatterRequests, PlatformConfig } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class ThermostatAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger, config: PlatformConfig = { platform: 'Matter' }) {
    const serialNumber = 'matter-thermostat'
    const matter = getMatter(api)
    const warnings: string[] = []

    // Which modes does this thermostat have? Homebridge derives the features
    // from the declared setpoints, and both setpoints means AutoMode too - so
    // any other combination needs the cluster composed by hand, below.
    let heat = config.thermostatRemoveHeatMode !== true
    let cool = config.thermostatRemoveCoolMode !== true
    if (!heat && !cool) {
      warnings.push('a thermostat must be able to heat or cool - ignoring both "remove" options')
      heat = true
      cool = true
    }
    let auto = heat && cool && config.thermostatRemoveAutoMode !== true

    let deviceType = matter.deviceTypes.Thermostat
    const customised = !(heat && cool && auto)
    if (customised) {
      // deviceRequirements arrives in Homebridge v2.4.0. Read it defensively so
      // the plugin still loads and runs on v2.3.x - the options just warn there.
      // ⚠️ On the fallback the STATE below must also revert to the full default:
      // Homebridge will detect Heating, Cooling and AutoMode from the setpoints,
      // and declared state has to match the features the cluster ends up with.
      const requirements = matter.deviceRequirements
      if (requirements) {
        const features = [
          ...(heat ? ['Heating' as const] : []),
          ...(cool ? ['Cooling' as const] : []),
          ...(auto ? ['AutoMode' as const] : []),
          // Once the cluster is composed by hand, Homebridge adds NO features of
          // its own - and this accessory declares unoccupied setpoints, so
          // Occupancy has to be chosen here rather than detected.
          'Occupancy' as const,
        ]
        deviceType = matter.deviceTypes.Thermostat.with(
          requirements.Thermostat.ThermostatServer.with(...features),
        )
      } else {
        warnings.push('customising the thermostat modes requires Homebridge v2.4.0 or later - using the default Heat, Cool and Auto')
        heat = true
        cool = true
        auto = true
      }
    }

    const thermostat: Record<string, unknown> = {
      externalMeasuredIndoorTemperature: 2100, // 21.00°C
      // 4 = cooling and heating, 2 = heating only, 0 = cooling only
      controlSequenceOfOperation: heat && cool ? 4 : heat ? 2 : 0,
      // Auto (1) is only a valid mode when the AutoMode feature is present
      systemMode: auto ? 1 : heat ? 4 : 3, // (0=off, 1=auto, 3=cool, 4=heat)
      externallyMeasuredOccupancy: true, // default to occupied state (via external sensor)
    }

    if (heat) {
      thermostat.occupiedHeatingSetpoint = 2000 // 20.00°C
      thermostat.unoccupiedHeatingSetpoint = 1800 // 18.00°C
      thermostat.minHeatSetpointLimit = 700 // 7.00°C
      thermostat.maxHeatSetpointLimit = 3000 // 30.00°C
    }

    if (cool) {
      thermostat.occupiedCoolingSetpoint = 2400 // 24.00°C
      thermostat.unoccupiedCoolingSetpoint = 2600 // 26.00°C
      thermostat.minCoolSetpointLimit = 1600 // 16.00°C
      thermostat.maxCoolSetpointLimit = 3200 // 32.00°C
    }

    if (auto) {
      // ⚠️ In Auto mode the deadband applies to the LIMITS as well as the
      // setpoints. Both of these must hold, in 0.01°C units:
      //   maxCoolSetpointLimit - maxHeatSetpointLimit >= deadband
      //   minCoolSetpointLimit - minHeatSetpointLimit >= deadband
      // This value is in 0.1°C units, so it is multiplied by 10 first: 20
      // means 2.0°C, i.e. 200.
      //
      // The limits above sit at the spec's absolute maxima (heat 30.00°C,
      // cool 32.00°C), so the widest gap available is 2.0°C. A deadband of
      // 2.5°C cannot be satisfied here at all - it would need
      // maxHeatSetpointLimit lowered to 29.50°C instead.
      //
      // Without AutoMode the deadband must NOT be declared - it is an
      // Auto-mode concept, and the limit rules above stop applying too.
      thermostat.minSetpointDeadBand = 20 // 2.0°C minimum difference between heat/cool setpoints (required for Auto mode)
    }

    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'Thermostat',
      deviceType,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-THERMOSTAT',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        thermostat,
      },

      handlers: {
        thermostat: {
          setpointRaiseLower: async request => this.handleSetpointRaiseLower(request),
          systemModeChange: async request => this.handleSystemModeChange(request),
          // Only register handlers for the setpoints this thermostat has - a
          // mode that was removed has no attribute for the handler to watch.
          ...(heat ? { occupiedHeatingSetpointChange: async (request: { occupiedHeatingSetpoint: number, oldOccupiedHeatingSetpoint: number }) => this.handleOccupiedHeatingSetpointChange(request) } : {}),
          ...(cool ? { occupiedCoolingSetpointChange: async (request: { occupiedCoolingSetpoint: number, oldOccupiedCoolingSetpoint: number }) => this.handleOccupiedCoolingSetpointChange(request) } : {}),
        },
      },
    })

    warnings.forEach(warning => this.logWarn(warning))
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
    //   throw this.statusError('InvalidAction',
    //     `System mode ${modeName} is not supported by this device`
    //   )
    // }

    // Example: Check if mode change is allowed based on external conditions
    // if (request.systemMode === 4 && this.outdoorTemp > 30) {
    //   throw this.statusError('InvalidInState',
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
    //   throw this.statusError('ConstraintError',
    //     `Heating setpoint ${celsius}°C is out of range (${minTemp}-${maxTemp}°C)`
    //   )
    // }

    // Example: Ensure heating setpoint is below cooling setpoint
    // if (celsius >= this.coolingSetpoint) {
    //   throw this.statusError('ConstraintError',
    //     `Heating setpoint must be below cooling setpoint (${this.coolingSetpoint}°C)`
    //   )
    // }

    // Example: Check if heating is supported
    // if (!this.supportsHeating) {
    //   throw this.statusError('InvalidInState', 'Device does not support heating mode')
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
    await this.updateState('thermostat', { externallyMeasuredOccupancy: occupied })
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
