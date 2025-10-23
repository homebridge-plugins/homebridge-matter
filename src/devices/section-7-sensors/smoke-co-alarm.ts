/**
 * Smoke/CO Alarm Device (Matter Spec § 7.9)
 *
 * A combined smoke and carbon monoxide alarm sensor.
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - SmokeCoAlarm cluster for smoke/CO detection
 * - Device feature configuration (SmokeAlarm and CoAlarm features)
 */

import type { DeviceContext } from '../types.js'

export function registerSmokeCoAlarm(context: DeviceContext): any[] {
  const { api, config } = context
  const accessories: any[] = []

  if (!config.enableSmokeSensor) {
    return accessories
  }

  // SmokeCoAlarmDevice requires specifying features (SmokeAlarm and/or CoAlarm)
  const SmokeCoAlarmServer = api.matter.deviceTypes.SmokeSensor.requirements.SmokeCoAlarmServer
  const SmokeSensorWithBoth = api.matter.deviceTypes.SmokeSensor.with(
    SmokeCoAlarmServer.with('SmokeAlarm', 'CoAlarm'),
  )

  accessories.push({
    uuid: api.matter.uuid.generate('matter-smoke-sensor'),
    displayName: 'Smoke Sensor',
    deviceType: SmokeSensorWithBoth,
    serialNumber: 'SMOKE-001',
    manufacturer: 'Homebridge',
    model: 'Smoke Sensor Example',
    clusters: {
      smokeCoAlarm: {
        smokeState: 0, // 0 = Normal, 1 = Warning, 2 = Critical
        coState: 0, // 0 = Normal, 1 = Warning, 2 = Critical
        batteryAlert: 0, // 0 = Normal
        testInProgress: false,
        hardwareFaultAlert: false,
        endOfServiceAlert: 0, // 0 = Normal
        interconnectSmokeAlarm: 0, // 0 = Normal
        interconnectCoAlarm: 0, // 0 = Normal
      },
    },
  })

  return accessories
}
