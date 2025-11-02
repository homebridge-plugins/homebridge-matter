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
    this.logInfo(`GoToLiftPercentage request: ${JSON.stringify(request)}`)
    // Matter uses 0=open, 10000=closed, so invert to get open percentage
    const closedPercent = request.liftPercent100thsValue / 100
    const openPercent = (100 - closedPercent).toFixed(0)
    this.logInfo(`moving to ${openPercent}% open.`)

    // Example: Check if blind motor is already moving
    // if (this.isMotorActive) {
    //   throw new MatterStatus.Busy('Blind is currently moving - stop it first')
    // }

    // Example: Check if blind is obstructed
    // if (this.isObstructionDetected) {
    //   throw new MatterStatus.InvalidInState('Cannot move blind - obstruction detected')
    // }

    // Example: Validate position is within calibrated range
    // if (!this.isCalibrated) {
    //   throw new MatterStatus.InvalidInState('Blind must be calibrated before position control')
    // }

    // TODO: await myBlindAPI.setPosition(openPercent)
  }

  private async handleUpOrOpen(): Promise<void> {
    this.logInfo('opened blind.')
    // TODO: await myBlindAPI.open()
  }

  private async handleDownOrClose(): Promise<void> {
    this.logInfo('closed blind.')
    // TODO: await myBlindAPI.close()
  }

  private async handleStop(): Promise<void> {
    this.logInfo('stopping blind.')

    // Example: Check if blind is actually moving before stopping
    // if (!this.isMotorActive) {
    //   throw new MatterStatus.InvalidInState('Blind is not currently moving')
    // }

    // Example: Check if device supports stop command
    // if (!this.supportsStopCommand) {
    //   throw new MatterStatus.InvalidAction('This blind model does not support stop command')
    // }

    // TODO: await myBlindAPI.stop()
    this.logInfo('stopped blind.')
  }

  public updateLiftPosition(openPercent: number): void {
    // Convert open percentage to Matter's closed percentage (0=open, 10000=closed)
    const closedPercent = 100 - openPercent
    const value = Math.round(closedPercent * 100)
    this.updateState(this.api.matter.clusterNames.WindowCovering, {
      currentPositionLiftPercent100ths: value,
      targetPositionLiftPercent100ths: value,
    })
    this.logInfo(`lift position: ${openPercent}% open.`)
  }
}
