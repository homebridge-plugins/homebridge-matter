/**
 * Robotic Vacuum Cleaner Accessory Class
 */

import type { API, Logger, MatterRequests } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class RoboticVacuumAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'VACUUM-001'
    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
      displayName: 'Robot Vacuum',
      deviceType: api.matter.deviceTypes.RoboticVacuumCleaner,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-VACUUM-ROBOTIC',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        rvcRunMode: {
          supportedModes: [
            { label: 'Idle', mode: 0, modeTags: [{ value: 16384 }] },
            { label: 'Cleaning', mode: 1, modeTags: [{ value: 16385 }] },
          ],
          currentMode: 0,
        },
        rvcCleanMode: {
          supportedModes: [
            { label: 'Vacuum', mode: 0, modeTags: [{ value: 16384 }] },
            { label: 'Mop', mode: 1, modeTags: [{ value: 16385 }] },
          ],
          currentMode: 0,
        },
        rvcOperationalState: {
          operationalStateList: [
            { operationalStateID: 0, operationalStateLabel: 'Stopped' },
            { operationalStateID: 1, operationalStateLabel: 'Running' },
            { operationalStateID: 2, operationalStateLabel: 'Paused' },
            { operationalStateID: 3, operationalStateLabel: 'Error' },
          ],
          operationalState: 0,
        },
      },

      handlers: {
        rvcRunMode: {
          changeToMode: async (request: MatterRequests.ChangeToMode) => this.handleChangeRunMode(request),
        },
        rvcCleanMode: {
          changeToMode: async (request: MatterRequests.ChangeToMode) => this.handleChangeCleanMode(request),
        },
        rvcOperationalState: {
          pause: async () => this.handlePause(),
          stop: async () => this.handleStop(),
          start: async () => this.handleStart(),
          resume: async () => this.handleResume(),
        },
      },
    })

    this.logInfo('initialized.')
  }

  private async handleChangeRunMode(request: MatterRequests.ChangeToMode): Promise<void> {
    this.logInfo(`ChangeToMode (run) request: ${JSON.stringify(request)}`)
    const { newMode } = request
    const modeStr = ['Idle', 'Cleaning'][newMode] || 'Unknown'
    this.logInfo((`changing run mode to: ${modeStr}.`))
    // TODO: await myVacuumAPI.setRunMode(newMode)
  }

  private async handleChangeCleanMode(request: MatterRequests.ChangeToMode): Promise<void> {
    this.logInfo(`ChangeToMode (clean) request: ${JSON.stringify(request)}`)
    const { newMode } = request
    const modeStr = ['Vacuum', 'Mop'][newMode] || 'Unknown'
    this.logInfo((`changing clean mode to: ${modeStr}.`))
    // TODO: await myVacuumAPI.setCleanMode(newMode)
  }

  private async handlePause(): Promise<void> {
    this.logInfo('pausing.')
    // TODO: await myVacuumAPI.pause()
  }

  private async handleStop(): Promise<void> {
    this.logInfo('stopping.')
    // TODO: await myVacuumAPI.stop()
  }

  private async handleStart(): Promise<void> {
    this.logInfo('starting.')
    // TODO: await myVacuumAPI.start()
  }

  private async handleResume(): Promise<void> {
    this.logInfo('resuming.')
    // TODO: await myVacuumAPI.resume()
  }

  public updateOperationalState(state: number): void {
    this.updateState('rvcOperationalState', { operationalState: state })
  }

  public updateRunMode(mode: number): void {
    this.updateState('rvcRunMode', { currentMode: mode })
  }

  public updateCleanMode(mode: number): void {
    this.updateState('rvcCleanMode', { currentMode: mode })
  }
}
