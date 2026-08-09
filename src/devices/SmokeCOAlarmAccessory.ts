/**
 * Smoke/CO Alarm Accessory Class
 */

import type { API, Logger, PlatformConfig } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class SmokeCOAlarmAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger, config: PlatformConfig = { platform: 'Matter' }) {
    const serialNumber = 'matter-smoke-sensor'
    const matter = getMatter(api)
    const warnings: string[] = []

    // Which alarms does this device have? Unlike the thermostat, nothing needs
    // composing here: Homebridge detects the SmokeAlarm and CoAlarm features
    // from whether smokeState and coState are DECLARED, so customising this
    // device is simply a matter of declaring only the state it really has -
    // the "declare only what you have" route described on the wiki's
    // Customising Features page.
    let smoke = config.smokeSensorRemoveSmokeAlarm !== true
    let co = config.smokeSensorRemoveCoAlarm !== true
    if (!smoke && !co) {
      warnings.push('a smoke/co alarm must have at least one alarm - ignoring both "remove" options')
      smoke = true
      co = true
    }

    const smokeCoAlarm: Record<string, unknown> = {
      batteryAlert: 0,
      deviceMuted: 0,
      testInProgress: false,
      hardwareFaultAlert: false,
      endOfServiceAlert: 0,
      expressedState: 0,
    }

    if (smoke) {
      smokeCoAlarm.smokeState = 0 // 0 = normal, 1 = warning, 2 = critical
      // These three are only valid alongside the SmokeAlarm feature
      smokeCoAlarm.interconnectSmokeAlarm = 0
      smokeCoAlarm.contaminationState = 0
      smokeCoAlarm.smokeSensitivityLevel = 1
    }

    if (co) {
      smokeCoAlarm.coState = 0
      // Only valid alongside the CoAlarm feature
      smokeCoAlarm.interconnectCoAlarm = 0
    }

    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'Smoke Sensor',
      // Homebridge >= 2.2.0 adds the SmokeCoAlarm cluster with the SmokeAlarm and
      // CoAlarm features auto-detected from the smokeState/coState attributes above.
      deviceType: matter.deviceTypes.SmokeSensor,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-SENSOR-SMOKE-CO',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        smokeCoAlarm,
      },
    })

    warnings.forEach(warning => this.logWarn(warning))
    this.logInfo('initialized.')
  }

  public async updateSmokeState(state: 0 | 1 | 2): Promise<void> {
    await this.updateState('smokeCoAlarm', { smokeState: state })
    const stateStr = ['Normal', 'Warning', 'Critical'][state]
    this.logInfo(`smoke state: ${stateStr}.`)
  }

  public async updateCOState(state: 0 | 1 | 2): Promise<void> {
    await this.updateState('smokeCoAlarm', { coState: state })
    const stateStr = ['Normal', 'Warning', 'Critical'][state]
    this.logInfo(`co state: ${stateStr}.`)
  }
}
