/**
 * Color Light Accessory Class (HS only)
 * Hue and Saturation color control
 */

import type { API, Logger, MatterRequests } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class ColorLightAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'LIGHT-004'
    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
      displayName: 'Colour Light (HS)',
      deviceType: api.matter.deviceTypes.ExtendedColorLight,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-LIGHT-COLOUR-HS',
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
          moveToColorLogic: async (request: MatterRequests.MoveToColor) =>
            this.handleSetColor(request),
          moveToHueAndSaturationLogic: async (request: MatterRequests.MoveToHueAndSaturation) =>
            this.handleSetHueSaturation(request),
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
    const { level } = request
    const brightnessPercent = Math.round((level / 254) * 100)
    this.logInfo(`setting brightness to ${brightnessPercent}%.`)
    // TODO: await myLightAPI.setBrightness(brightnessPercent)
  }

  private async handleSetColor(request: MatterRequests.MoveToColor): Promise<void> {
    const { colorX, colorY, transitionTime } = request
    const xFloat = (colorX / 65535).toFixed(4)
    const yFloat = (colorY / 65535).toFixed(4)
    this.logInfo(`setting xy color to (${xFloat}, ${yFloat}).`)
    // TODO: await myLightAPI.setXY(xFloat, yFloat, transitionTime)
  }

  private async handleSetHueSaturation(request: MatterRequests.MoveToHueAndSaturation): Promise<void> {
    const { hue, saturation, transitionTime } = request
    const hueDegrees = Math.round((hue / 254) * 360)
    const saturationPercent = Math.round((saturation / 254) * 100)
    this.logInfo(`setting color to ${hueDegrees}°, ${saturationPercent}%.`)
    // TODO: await myLightAPI.setColor(hueDegrees, saturationPercent, transitionTime)
  }

  public updateOnOffState(isOn: boolean): void {
    this.updateState(this.api.matter.clusterNames.OnOff, { onOff: isOn })
  }

  public updateBrightness(percent: number): void {
    const matterLevel = Math.max(1, Math.round((percent / 100) * 254))
    this.updateState(this.api.matter.clusterNames.LevelControl, { currentLevel: matterLevel })
  }

  public updateHueSaturation(hue: number, saturation: number): void {
    const matterHue = Math.round((hue / 360) * 254)
    const matterSat = Math.round((saturation / 100) * 254)
    this.updateState(this.api.matter.clusterNames.ColorControl, {
      currentHue: matterHue,
      currentSaturation: matterSat,
    })
  }
}
