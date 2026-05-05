/**
 * Venetian Blind Accessory Class
 * Lift and tilt control
 */

import type { API, Logger, MatterRequests } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class VenetianBlindAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-venetian-blind'
    const matter = getMatter(api)

    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'Venetian Blind (Tilt)',
      deviceType: matter.deviceTypes.WindowCovering,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-BLIND-VENETIAN',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        windowCovering: {
          targetPositionLiftPercent100ths: 5000,
          currentPositionLiftPercent100ths: 5000,
          targetPositionTiltPercent100ths: 5000,
          currentPositionTiltPercent100ths: 5000,
          operationalStatus: {
            global: 0,
            lift: 0,
            tilt: 0,
          },
          endProductType: 8,
          configStatus: {
            operational: true,
            onlineReserved: true,
            liftMovementReversed: false,
            liftPositionAware: true,
            tiltPositionAware: true,
            liftEncoderControlled: true,
            tiltEncoderControlled: true,
          },
        },
      },

      handlers: {
        windowCovering: {
          goToLiftPercentage: async request => this.handleGoToLift(request),
          goToTiltPercentage: async request => this.handleGoToTilt(request),
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
    this.logInfo(`moved to ${openPercent}% open.`)
    // TODO: await myBlindAPI.setPosition(openPercent)
  }

  private async handleGoToTilt(request: MatterRequests.GoToTiltPercentage): Promise<void> {
    this.logInfo(`GoToTiltPercentage request: ${JSON.stringify(request)}`)

    // Matter tilt: 0=horizontal/open (0deg), 10000=vertical/closed (90deg)
    const degrees = Math.round((request.tiltPercent100thsValue / 10000) * 90)
    this.logInfo(`tilting to ${degrees}°.`)

    // Example: Check if blind is in correct position for tilting
    // if (this.liftPosition < 10) {
    //   throw new MatterStatus.InvalidInState('Blind must be lowered at least 10% to adjust tilt')
    // }

    // Example: Check if tilt motor is already active
    // if (this.isTiltMotorActive) {
    //   throw new MatterStatus.Busy('Tilt motor is currently in use')
    // }

    // Example: Check if tilt mechanism is calibrated
    // if (!this.isTiltCalibrated) {
    //   throw new MatterStatus.InvalidInState('Tilt mechanism requires calibration')
    // }

    // Example: Validate tilt angle limits
    // const maxTilt = 85 // Some blinds can't go fully to 90 degrees
    // if (degrees > maxTilt) {
    //   throw new MatterStatus.ConstraintError(`Maximum tilt angle is ${maxTilt}°`)
    // }

    // TODO: await myBlindAPI.setTiltAngle(degrees)
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
    this.logInfo('stopped blind.')
    // TODO: await myBlindAPI.stop()
  }

  public async updateLiftPosition(openPercent: number): Promise<void> {
    // Convert open percentage to Matter's closed percentage (0=open, 10000=closed)
    const closedPercent = 100 - openPercent
    const value = Math.round(closedPercent * 100)
    await this.updateState(this.matter.clusterNames.WindowCovering, {
      currentPositionLiftPercent100ths: value,
      targetPositionLiftPercent100ths: value,
    })
    this.logInfo(`lift position: ${openPercent}% open.`)
  }

  public async updateTiltPosition(degrees: number): Promise<void> {
    // Convert degrees (0-90) to Matter's tilt percentage (0=horizontal, 10000=vertical)
    const value = Math.round((degrees / 90) * 10000)
    await this.updateState(this.matter.clusterNames.WindowCovering, {
      currentPositionTiltPercent100ths: value,
      targetPositionTiltPercent100ths: value,
    })
    this.logInfo(`tilt position: ${degrees}°.`)
  }
}
