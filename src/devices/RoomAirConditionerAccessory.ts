/**
 * Room Air Conditioner Accessory Class
 *
 * A heat-and-cool air conditioner with an Auto mode (Matter Spec § 13.3).
 *
 * Unlike the plain Thermostat device type, the stock Room Air Conditioner type
 * does not turn on Auto mode just because both setpoints are declared - every
 * air conditioner declares both. From Homebridge v2.5.0 it gets the AutoMode
 * feature when the accessory asks for it explicitly: it starts in Auto
 * (`systemMode: 1`) or declares `minSetpointDeadBand`. This example does both.
 * Leave both out for an air conditioner without Auto mode.
 */

import type { API, Logger, MatterRequests } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class RoomAirConditionerAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-room-air-conditioner'
    const matter = getMatter(api)
    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'Air Conditioner',
      deviceType: matter.deviceTypes.RoomAirConditioner,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-ROOM-AIR-CONDITIONER',
      firmwareRevision: '1.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        // The unit's power. Turning it off keeps the mode and setpoints, so it
        // comes back the way it was
        onOff: {
          onOff: true,
        },
        thermostat: {
          externalMeasuredIndoorTemperature: 2300, // 23.00°C
          controlSequenceOfOperation: 4, // cooling and heating
          systemMode: 1, // 0=off, 1=auto, 3=cool, 4=heat - starting in Auto asks for AutoMode
          occupiedHeatingSetpoint: 2000, // 20.00°C
          occupiedCoolingSetpoint: 2400, // 24.00°C
          // ⚠️ With AutoMode the deadband applies to the LIMITS as well as the
          // setpoints, in 0.01°C units:
          //   maxCoolSetpointLimit - maxHeatSetpointLimit >= deadband
          //   minCoolSetpointLimit - minHeatSetpointLimit >= deadband
          // The deadband itself is in 0.1°C units, so 20 is 2.0°C (200).
          minHeatSetpointLimit: 1600, // 16.00°C
          maxHeatSetpointLimit: 2800, // 28.00°C
          minCoolSetpointLimit: 1800, // 18.00°C
          maxCoolSetpointLimit: 3000, // 30.00°C
          minSetpointDeadBand: 20, // 2.0°C - declaring it also asks for AutoMode
        },
      },

      handlers: {
        onOff: {
          on: async () => this.handleOn(),
          off: async () => this.handleOff(),
        },
        thermostat: {
          setpointRaiseLower: async request => this.handleSetpointRaiseLower(request),
          systemModeChange: async request => this.handleSystemModeChange(request),
          occupiedHeatingSetpointChange: async request => this.handleHeatingSetpointChange(request),
          occupiedCoolingSetpointChange: async request => this.handleCoolingSetpointChange(request),
        },
      },
    })

    this.logInfo('initialized.')
  }

  private async handleOn(): Promise<void> {
    this.logInfo('turning on.')
    // TODO: await myAirConditionerAPI.turnOn()
  }

  private async handleOff(): Promise<void> {
    this.logInfo('turning off.')
    // TODO: await myAirConditionerAPI.turnOff()
  }

  private async handleSetpointRaiseLower(request: MatterRequests.SetpointRaiseLower): Promise<void> {
    const { mode, amount } = request
    this.logInfo(`adjusting setpoint by ${amount / 10}°C (mode: ${mode}).`)
    // TODO: await myAirConditionerAPI.adjustSetpoint(mode, amount / 10)
  }

  private async handleSystemModeChange(request: { systemMode: number, oldSystemMode: number }): Promise<void> {
    const modeNames: Record<number, string> = {
      0: 'Off',
      1: 'Auto',
      3: 'Cool',
      4: 'Heat',
    }
    const modeName = modeNames[request.systemMode] ?? `Unknown (${request.systemMode})`
    this.logInfo(`system mode changed to: ${modeName}.`)

    // Example: In Auto the unit picks heating or cooling itself, keeping the
    // room between the two setpoints
    // if (request.systemMode === 1) {
    //   await myAirConditionerAPI.setAuto(this.heatingSetpoint, this.coolingSetpoint)
    //   return
    // }

    // TODO: await myAirConditionerAPI.setMode(request.systemMode)
  }

  private async handleHeatingSetpointChange(request: { occupiedHeatingSetpoint: number, oldOccupiedHeatingSetpoint: number }): Promise<void> {
    this.logInfo(`heating setpoint changed to: ${request.occupiedHeatingSetpoint / 100}°C.`)
    // TODO: await myAirConditionerAPI.setHeatingSetpoint(request.occupiedHeatingSetpoint / 100)
  }

  private async handleCoolingSetpointChange(request: { occupiedCoolingSetpoint: number, oldOccupiedCoolingSetpoint: number }): Promise<void> {
    this.logInfo(`cooling setpoint changed to: ${request.occupiedCoolingSetpoint / 100}°C.`)
    // TODO: await myAirConditionerAPI.setCoolingSetpoint(request.occupiedCoolingSetpoint / 100)
  }

  public async updatePower(isOn: boolean): Promise<void> {
    await this.updateState(this.matter.clusterNames.OnOff, { onOff: isOn })
    this.logInfo(`power: ${isOn ? 'on' : 'off'}.`)
  }

  public async updateCurrentTemperature(celsius: number): Promise<void> {
    await this.updateState('thermostat', {
      externalMeasuredIndoorTemperature: Math.round(celsius * 100),
    })
    this.logInfo(`current temperature: ${celsius}°C.`)
  }

  public async updateSystemMode(mode: number): Promise<void> {
    await this.updateState('thermostat', { systemMode: mode })
  }
}
