import type { API, Logger, PlatformConfig } from 'homebridge'

import { describe, expect, it, vi } from 'vitest'

import { SmokeCOAlarmAccessory } from './SmokeCOAlarmAccessory.js'

/**
 * The smoke/CO alarm is customised the OTHER way to the thermostat: nothing is
 * composed, because Homebridge detects the SmokeAlarm and CoAlarm features from
 * whether smokeState and coState are declared. So what these tests pin is the
 * declared STATE - an attribute belonging to a removed alarm must not be
 * declared, or it fails conformance against the detected features.
 */

function build(config?: Record<string, unknown>) {
  const api = {
    matter: {
      uuid: { generate: (value: string) => `uuid-${value}` },
      deviceTypes: { SmokeSensor: { name: 'SmokeCoAlarmDevice' } },
    },
  } as unknown as API
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as unknown as Logger

  const device = config === undefined
    ? new SmokeCOAlarmAccessory(api, log)
    : new SmokeCOAlarmAccessory(api, log, { platform: 'Matter', ...config } as PlatformConfig)
  const smokeCoAlarm = device.toAccessory().clusters?.smokeCoAlarm as Record<string, unknown>
  return { log, smokeCoAlarm }
}

describe('default configuration', () => {
  it('declares both alarm states, so both features are detected', () => {
    const { smokeCoAlarm } = build({})

    expect(smokeCoAlarm.smokeState).toBe(0)
    expect(smokeCoAlarm.coState).toBe(0)
    expect(smokeCoAlarm.smokeSensitivityLevel).toBe(1)
    expect(smokeCoAlarm.interconnectCoAlarm).toBe(0)
  })

  it('behaves identically when no config is passed at all', () => {
    const { smokeCoAlarm } = build()

    expect(smokeCoAlarm.smokeState).toBe(0)
    expect(smokeCoAlarm.coState).toBe(0)
  })
})

describe('remove smoke alarm', () => {
  it('declares no smoke-feature attributes at all, leaving a co-only alarm', () => {
    const { smokeCoAlarm } = build({ smokeSensorRemoveSmokeAlarm: true })

    // All four ride on the SmokeAlarm feature - any of them declared without it
    // fails conformance
    expect(smokeCoAlarm.smokeState).toBeUndefined()
    expect(smokeCoAlarm.interconnectSmokeAlarm).toBeUndefined()
    expect(smokeCoAlarm.contaminationState).toBeUndefined()
    expect(smokeCoAlarm.smokeSensitivityLevel).toBeUndefined()

    expect(smokeCoAlarm.coState).toBe(0)
    expect(smokeCoAlarm.interconnectCoAlarm).toBe(0)
  })
})

describe('remove co alarm', () => {
  it('declares no co-feature attributes at all, leaving a smoke-only alarm', () => {
    const { smokeCoAlarm } = build({ smokeSensorRemoveCoAlarm: true })

    expect(smokeCoAlarm.coState).toBeUndefined()
    expect(smokeCoAlarm.interconnectCoAlarm).toBeUndefined()

    expect(smokeCoAlarm.smokeState).toBe(0)
    expect(smokeCoAlarm.smokeSensitivityLevel).toBe(1)
  })
})

describe('impossible combinations', () => {
  it('warns and ignores both options when both alarms are removed', () => {
    const { log, smokeCoAlarm } = build({
      smokeSensorRemoveSmokeAlarm: true,
      smokeSensorRemoveCoAlarm: true,
    })

    expect(vi.mocked(log.warn).mock.calls.join(' ')).toContain('at least one alarm')
    expect(smokeCoAlarm.smokeState).toBe(0)
    expect(smokeCoAlarm.coState).toBe(0)
  })
})
