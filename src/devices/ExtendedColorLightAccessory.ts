/**
 * Extended Color Light Accessory Class (HS+CCT)
 * Hue, Saturation, and Color Temperature control
 */

import type { API, Logger, MatterRequests } from 'homebridge'

// Handler type approaches:
// 1. MatterRequests.* — raw matter.js request types (useful for some handlers like MoveToLevel)
// 2. ClusterHandlerMap — behavior-transformed types with automatic inference (recommended for color handlers)
// Both approaches work. Color handlers use inferred types since the behavior transforms the request.
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class ExtendedColorLightAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'LIGHT-005'
    super(api, log, {
      UUID: api.matter.uuid.generate(serialNumber),
      displayName: 'Extended Colour Light (HS+CCT)',
      deviceType: api.matter.deviceTypes.ExtendedColorLight,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-LIGHT-EXTENDED-COLOUR',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        onOff: { onOff: false },
        levelControl: {
          currentLevel: 127,
          minLevel: 1,
          maxLevel: 254,
        },
        colorControl: {
          colorMode: api.matter.types.ColorControl.ColorMode.CurrentHueAndCurrentSaturation,
          currentHue: 0,
          currentSaturation: 254,
          currentX: 41942,
          currentY: 21626,
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
          moveToLevelWithOnOff: async request => this.handleSetLevel(request),
        },
        colorControl: {
          // Color handlers use inferred types from ClusterHandlerMap — the behavior transforms
          // the raw matter.js request before passing it to your handler
          moveToColorLogic: async request => this.handleSetColor(request),
          moveToHueAndSaturationLogic: async request => this.handleSetHueSaturation(request),
          moveToColorTemperatureLogic: async request => this.handleSetColorTemperature(request),
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
    this.logInfo(`setting brightness to ${brightnessPercent}%.`)
    // TODO: await myLightAPI.setBrightness(brightnessPercent)
  }

  private async handleSetColor(request: { targetX: number, targetY: number, transitionTime: number }): Promise<void> {
    this.logInfo(`MoveToColor request: ${JSON.stringify(request)}`)
    const { targetX, targetY, transitionTime } = request
    const xFloat = (targetX / 65535).toFixed(4)
    const yFloat = (targetY / 65535).toFixed(4)
    this.logInfo(`setting xy color to (${xFloat}, ${yFloat}).`)
    // TODO: await myLightAPI.setXY(xFloat, yFloat, transitionTime)
  }

  private async handleSetHueSaturation(request: { hue: number, saturation: number, transitionTime: number }): Promise<void> {
    this.logInfo(`MoveToHueAndSaturation request: ${JSON.stringify(request)}`)
    const { hue, saturation, transitionTime } = request
    const hueDegrees = Math.round((hue / 254) * 360)
    const saturationPercent = Math.round((saturation / 254) * 100)
    this.logInfo(`setting color to ${hueDegrees}°, ${saturationPercent}%.`)
    // TODO: await myLightAPI.setColor(hueDegrees, saturationPercent, transitionTime)
  }

  private async handleSetColorTemperature(request: { colorTemperatureMireds: number, transitionTime: number }): Promise<void> {
    this.logInfo(`MoveToColorTemperature request: ${JSON.stringify(request)}`)
    const { colorTemperatureMireds, transitionTime } = request
    const kelvin = Math.round(1000000 / colorTemperatureMireds)
    this.logInfo(`setting color temp to ${kelvin}k.`)

    // Example: Validate color temperature is within device physical limits
    // const minMireds = 147 // ~6800K (cool white)
    // const maxMireds = 454 // ~2200K (warm white)
    // if (colorTemperatureMireds < minMireds || colorTemperatureMireds > maxMireds) {
    //   throw new MatterStatus.ConstraintError(
    //     `Color temperature ${kelvin}K is out of range (2200K-6800K)`
    //   )
    // }

    // Example: Check if bulb is in the correct color mode for CCT
    // if (this.currentColorMode === 'xy' || this.currentColorMode === 'hs') {
    //   throw new MatterStatus.InvalidInState(
    //     'Cannot set color temperature while in color mode - switch to white mode first'
    //   )
    // }

    // Example: Check if bulb supports tunable white
    // if (!this.supportsTunableWhite) {
    //   throw new MatterStatus.InvalidAction('This bulb does not support color temperature adjustment')
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

  public async updateHueSaturation(hue: number, saturation: number): Promise<void> {
    const matterHue = Math.round((hue / 360) * 254)
    const matterSat = Math.round((saturation / 100) * 254)
    await this.updateState(this.api.matter.clusterNames.ColorControl, {
      currentHue: matterHue,
      currentSaturation: matterSat,
    })
  }
}
