/**
 * Color Temperature Light Accessory Class
 */

import type { API, Logger, MatterRequests } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class ColorTemperatureLightAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'LIGHT-003'
    super(api, log, {
      UUID: api.matter.uuid.generate(serialNumber),
      displayName: 'Colour Temperature Light',
      deviceType: api.matter.deviceTypes.ColorTemperatureLight,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-LIGHT-COLOUR-TEMP',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        onOff: {
          onOff: false,
        },
        levelControl: {
          currentLevel: 127,
          minLevel: 1,
          maxLevel: 254,
        },
        colorControl: {
          colorMode: api.matter.types.ColorControl.ColorMode.ColorTemperatureMireds,
          colorTemperatureMireds: 250,
          colorTempPhysicalMinMireds: 147,
          colorTempPhysicalMaxMireds: 454,
          coupleColorTempToLevelMinMireds: 147,
        },
      },

      handlers: {
        onOff: {
          on: async () => this.handleOn(),
          off: async () => this.handleOff(),
        },
        levelControl: {
          moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) =>
            this.handleSetLevel(request),
        },
        colorControl: {
          moveToColorTemperatureLogic: async (request: MatterRequests.MoveToColorTemperature) =>
            this.handleSetColorTemperature(request),
        },
      },
    })

    this.logInfo('initialized.')
  }

  private async handleOn(): Promise<void> {
    this.logInfo('turning on.')
    // TODO: await myLightAPI.turnOn()
  }

  private async handleOff(): Promise<void> {
    this.logInfo('turning off.')
    // TODO: await myLightAPI.turnOff()
  }

  private async handleSetLevel(request: MatterRequests.MoveToLevel): Promise<void> {
    this.logInfo(`MoveToLevel request: ${JSON.stringify(request)}`)
    const { level } = request
    const brightnessPercent = Math.round((level / 254) * 100)
    this.logInfo(`setting brightness to ${brightnessPercent}% (level: ${level}).`)
    // TODO: await myLightAPI.setBrightness(brightnessPercent)
  }

  private async handleSetColorTemperature(request: MatterRequests.MoveToColorTemperature): Promise<void> {
    this.logInfo(`MoveToColorTemperature request: ${JSON.stringify(request)}`)
    const { colorTemperatureMireds, transitionTime } = request
    const kelvin = Math.round(1000000 / colorTemperatureMireds)
    this.logInfo(`setting color temp to ${kelvin}k (${colorTemperatureMireds} mireds).`)

    // Example: Validate against physical limits defined in cluster
    // const minMireds = 147 // ~6800K (cool daylight)
    // const maxMireds = 454 // ~2200K (warm candlelight)
    // if (colorTemperatureMireds < minMireds) {
    //   throw new MatterStatus.ConstraintError(`Color temp ${kelvin}K exceeds maximum 6800K`)
    // }
    // if (colorTemperatureMireds > maxMireds) {
    //   throw new MatterStatus.ConstraintError(`Color temp ${kelvin}K below minimum 2200K`)
    // }

    // Example: Check if adjustment requires recalibration
    // if (this.needsRecalibration && Math.abs(colorTemperatureMireds - this.lastMireds) > 100) {
    //   throw new MatterStatus.InvalidInState('Large color temp change requires recalibration')
    // }

    // TODO: await myLightAPI.setColorTemperature(kelvin, transitionTime)
  }

  public async updateOnOffState(isOn: boolean): Promise<void> {
    await this.updateState(this.api.matter.clusterNames.OnOff, { onOff: isOn })
  }

  public async updateBrightness(percent: number): Promise<void> {
    const matterLevel = Math.max(1, Math.round((percent / 100) * 254))
    await this.updateState(this.api.matter.clusterNames.LevelControl, { currentLevel: matterLevel })
  }

  public async updateColorTemperature(kelvin: number): Promise<void> {
    const mireds = Math.round(1000000 / kelvin)
    await this.updateState(this.api.matter.clusterNames.ColorControl, { colorTemperatureMireds: mireds })
  }
}
