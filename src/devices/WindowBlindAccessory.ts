/**
 * Window Blind Accessory Class
 * Lift control only (up/down)
 */

import type { API, Logger, MatterRequests } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class WindowBlindAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'BLIND-001'

    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
      displayName: 'Window Blind',
      deviceType: api.matter.deviceTypes.WindowCovering,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-BLIND-WINDOW',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        windowCovering: {
          targetPositionLiftPercent100ths: 5000,
          currentPositionLiftPercent100ths: 5000,
          operationalStatus: {
            global: 0,
            lift: 0,
            tilt: 0,
          },
          endProductType: 0,
          configStatus: {
            operational: true,
            onlineReserved: true,
            liftMovementReversed: false,
            liftPositionAware: true,
            tiltPositionAware: false,
            liftEncoderControlled: true,
            tiltEncoderControlled: false,
          },
        },
      },

      handlers: {
        windowCovering: {
          goToLiftPercentage: async (request: MatterRequests.GoToLiftPercentage) =>
            this.handleGoToLift(request),
          upOrOpen: async () => this.handleUpOrOpen(),
          downOrClose: async () => this.handleDownOrClose(),
          stopMotion: async () => this.handleStop(),
        },
      },
    })

    this.logInfo('initialized.')
  }

  private async handleGoToLift(request: MatterRequests.GoToLiftPercentage): Promise<void> {
    const percent = (request.liftPercent100thsValue / 100).toFixed(0)
    this.logInfo(`moving to ${percent}% open.`)
    // TODO: await myBlindAPI.setPosition(percent)
  }

  private async handleUpOrOpen(): Promise<void> {
    this.logInfo('opening blind.')
    // TODO: await myBlindAPI.open()
  }

  private async handleDownOrClose(): Promise<void> {
    this.logInfo('closing blind.')
    // TODO: await myBlindAPI.close()
  }

  private async handleStop(): Promise<void> {
    this.logInfo('stopping blind.')
    // TODO: await myBlindAPI.stop()
  }

  public updateLiftPosition(percent: number): void {
    const value = Math.round(percent * 100)
    this.updateState('windowCovering', {
      currentPositionLiftPercent100ths: value,
      targetPositionLiftPercent100ths: value,
    })
    this.logInfo(`lift position: ${percent}%.`)
  }
}
