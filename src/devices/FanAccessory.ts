/**
 * Fan Accessory Class
 */

import type { API, Logger, MatterRequests } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class FanAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'FAN-001'
    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
      displayName: 'Fan',
      deviceType: api.matter.deviceTypes.Fan,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-FAN',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        fanControl: {
          fanMode: api.matter.types.FanControl.FanMode.Off,
          fanModeSequence: api.matter.types.FanControl.FanModeSequence.OffLowMedHigh,
          percentSetting: 0,
          percentCurrent: 0,
        },
      },

      handlers: {
        fanControl: {
          step: async (request: MatterRequests.FanStep) => this.handleStep(request),
          fanModeChange: async (request: { fanMode: number, oldFanMode: number }) => this.handleFanModeChange(request),
          percentSettingChange: async (request: { percentSetting: number | null, oldPercentSetting: number | null }) =>
            this.handlePercentSettingChange(request),
        },
      },
    })

    this.logInfo('initialized.')
  }

  private async handleStep(request: MatterRequests.FanStep): Promise<void> {
    this.logInfo(`FanStep request: ${JSON.stringify(request)}`)
    const { direction, wrap, lowestOff } = request
    const dirStr = direction === 0 ? 'increase' : 'decrease'
    this.logInfo(`step ${dirStr} (wrap: ${wrap}, lowestoff: ${lowestOff}).`)
    // TODO: await myFanAPI.step(direction, wrap, lowestOff)
  }

  private async handleFanModeChange(request: { fanMode: number, oldFanMode: number }): Promise<void> {
    this.logInfo(`FanMode change: ${JSON.stringify(request)}`)
    const modeNames = ['Off', 'Low', 'Medium', 'High', 'On', 'Auto', 'Smart']
    const modeName = modeNames[request.fanMode] || `Unknown (${request.fanMode})`
    this.logInfo(`fan mode changed to: ${modeName}.`)

    // Example: Check if requested mode is supported by the fan
    // const supportedModes = [0, 1, 2, 3, 4] // Off, Low, Medium, High, On
    // if (!supportedModes.includes(request.fanMode)) {
    //   throw new MatterStatus.InvalidAction(
    //     `Fan mode ${modeName} is not supported by this device`
    //   )
    // }

    // Example: Check if fan can change modes while running
    // if (this.isOscillating && request.fanMode === 5) {
    //   throw new MatterStatus.InvalidInState(
    //     'Cannot switch to Auto mode while oscillating'
    //   )
    // }

    // TODO: await myFanAPI.setMode(request.fanMode)
  }

  private async handlePercentSettingChange(request: { percentSetting: number | null, oldPercentSetting: number | null }): Promise<void> {
    this.logInfo(`PercentSetting change: ${JSON.stringify(request)}`)
    const percent = request.percentSetting ?? 0
    const isOff = percent === 0
    const wasOff = (request.oldPercentSetting ?? 0) === 0

    // Example: Validate speed percentage is within supported range
    // if (percent < 0 || percent > 100) {
    //   throw new MatterStatus.ConstraintError(
    //     `Fan speed ${percent}% is out of range (0-100)`
    //   )
    // }

    // Example: Check if fan supports variable speed control
    // if (percent > 0 && percent < 100 && !this.supportsVariableSpeed) {
    //   throw new MatterStatus.InvalidAction(
    //     'This fan only supports fixed speeds (Low/Medium/High), not variable percentage'
    //   )
    // }

    // Example: Enforce minimum speed when fan is on
    // const minSpeed = 20
    // if (percent > 0 && percent < minSpeed) {
    //   throw new MatterStatus.ConstraintError(
    //     `Fan minimum speed is ${minSpeed}% when on`
    //   )
    // }

    if (isOff !== wasOff) {
      this.logInfo(`fan turned ${isOff ? 'off' : 'on'}.`)
    }

    if (!isOff) {
      this.logInfo(`fan speed changed to: ${percent}%.`)
    }
    // TODO: await myFanAPI.setSpeed(percent)
  }

  public async updateFanMode(mode: number): Promise<void> {
    await this.updateState(this.api.matter.clusterNames.FanControl, { fanMode: mode })
  }

  public async updateFanSpeed(percent: number): Promise<void> {
    await this.updateState(this.api.matter.clusterNames.FanControl, {
      percentSetting: percent,
      percentCurrent: percent,
    })
    this.logInfo(`fan speed: ${percent}%.`)
  }
}
