import type { API, Logger, PlatformConfig } from 'homebridge'

import { describe, expect, it, vi } from 'vitest'

import { ThermostatAccessory } from './ThermostatAccessory.js'

/**
 * The thermostat is the one accessory whose device type depends on the config:
 * the "remove mode" options compose the thermostat cluster by hand instead of
 * letting Homebridge derive the features from the setpoints. These tests pin
 * the shape of what gets registered for each combination - the features chosen,
 * the state declared, and the handlers registered - because a mismatch between
 * any two of those is exactly the class of bug that registers cleanly and then
 * fails on every later interaction.
 */

const BASE_DEVICE_TYPE = { name: 'ThermostatDevice' }

function makeHarness({ withRequirements = true } = {}) {
  const serverWith = vi.fn((...features: string[]) => ({ composedServer: features }))
  const deviceTypeWith = vi.fn((server: unknown) => ({ composed: server }))

  const api = {
    matter: {
      uuid: { generate: (value: string) => `uuid-${value}` },
      deviceTypes: { Thermostat: { ...BASE_DEVICE_TYPE, with: deviceTypeWith } },
      ...(withRequirements
        ? { deviceRequirements: { Thermostat: { ThermostatServer: { with: serverWith } } } }
        : {}),
    },
  } as unknown as API

  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as unknown as Logger

  return { api, log, serverWith, deviceTypeWith }
}

function build(config?: Record<string, unknown>, harnessOptions?: { withRequirements?: boolean }) {
  const harness = makeHarness(harnessOptions)
  const device = config === undefined
    ? new ThermostatAccessory(harness.api, harness.log)
    : new ThermostatAccessory(harness.api, harness.log, { platform: 'Matter', ...config } as PlatformConfig)
  const accessory = device.toAccessory()
  const thermostat = accessory.clusters?.thermostat as Record<string, unknown>
  const handlers = accessory.handlers?.thermostat as Record<string, unknown>
  return { ...harness, accessory, thermostat, handlers }
}

describe('default configuration', () => {
  it('keeps the plain device type so Homebridge detects the features itself', () => {
    const { accessory, deviceTypeWith, thermostat, handlers } = build({})

    expect(deviceTypeWith).not.toHaveBeenCalled()
    expect((accessory.deviceType as { name?: string }).name).toBe('ThermostatDevice')

    // The full heat + cool + auto shape, exactly as before the options existed
    expect(thermostat.minSetpointDeadBand).toBe(20)
    expect(thermostat.systemMode).toBe(1)
    expect(thermostat.controlSequenceOfOperation).toBe(4)
    expect(thermostat.occupiedHeatingSetpoint).toBe(2000)
    expect(thermostat.occupiedCoolingSetpoint).toBe(2400)
    expect(handlers.occupiedHeatingSetpointChange).toBeDefined()
    expect(handlers.occupiedCoolingSetpointChange).toBeDefined()
  })

  it('behaves identically when no config is passed at all', () => {
    const { deviceTypeWith, thermostat } = build()

    expect(deviceTypeWith).not.toHaveBeenCalled()
    expect(thermostat.systemMode).toBe(1)
  })
})

describe('remove auto mode', () => {
  it('composes Heating and Cooling with Occupancy, but no AutoMode', () => {
    const { serverWith, deviceTypeWith } = build({ thermostatRemoveAutoMode: true })

    expect(serverWith).toHaveBeenCalledWith('Heating', 'Cooling', 'Occupancy')
    expect(deviceTypeWith).toHaveBeenCalledTimes(1)
  })

  it('drops the deadband and starts on Heat, since Auto is not a valid mode', () => {
    const { thermostat } = build({ thermostatRemoveAutoMode: true })

    // The deadband is an Auto-mode concept - declaring it without the feature
    // fails conformance
    expect(thermostat.minSetpointDeadBand).toBeUndefined()
    expect(thermostat.systemMode).toBe(4)
    // Still heats and cools
    expect(thermostat.controlSequenceOfOperation).toBe(4)
    expect(thermostat.occupiedHeatingSetpoint).toBe(2000)
    expect(thermostat.occupiedCoolingSetpoint).toBe(2400)
  })
})

describe('remove heat mode', () => {
  it('composes a cooling-only cluster and declares no heating state at all', () => {
    const { serverWith, thermostat, handlers } = build({ thermostatRemoveHeatMode: true })

    expect(serverWith).toHaveBeenCalledWith('Cooling', 'Occupancy')

    // Heating attributes on a no-Heating cluster would fail conformance
    expect(thermostat.occupiedHeatingSetpoint).toBeUndefined()
    expect(thermostat.unoccupiedHeatingSetpoint).toBeUndefined()
    expect(thermostat.minHeatSetpointLimit).toBeUndefined()
    expect(thermostat.maxHeatSetpointLimit).toBeUndefined()
    expect(thermostat.minSetpointDeadBand).toBeUndefined()

    expect(thermostat.systemMode).toBe(3) // cool
    expect(thermostat.controlSequenceOfOperation).toBe(0) // cooling only
    expect(handlers.occupiedHeatingSetpointChange).toBeUndefined()
    expect(handlers.occupiedCoolingSetpointChange).toBeDefined()
  })
})

describe('remove cool mode', () => {
  it('composes a heating-only cluster and declares no cooling state at all', () => {
    const { serverWith, thermostat, handlers } = build({ thermostatRemoveCoolMode: true })

    expect(serverWith).toHaveBeenCalledWith('Heating', 'Occupancy')

    expect(thermostat.occupiedCoolingSetpoint).toBeUndefined()
    expect(thermostat.unoccupiedCoolingSetpoint).toBeUndefined()
    expect(thermostat.minCoolSetpointLimit).toBeUndefined()
    expect(thermostat.maxCoolSetpointLimit).toBeUndefined()
    expect(thermostat.minSetpointDeadBand).toBeUndefined()

    expect(thermostat.systemMode).toBe(4) // heat
    expect(thermostat.controlSequenceOfOperation).toBe(2) // heating only
    expect(handlers.occupiedCoolingSetpointChange).toBeUndefined()
    expect(handlers.occupiedHeatingSetpointChange).toBeDefined()
  })
})

describe('impossible combinations', () => {
  it('warns and ignores both options when heat and cool are both removed', () => {
    const { log, thermostat, deviceTypeWith } = build({
      thermostatRemoveHeatMode: true,
      thermostatRemoveCoolMode: true,
    })

    expect(vi.mocked(log.warn).mock.calls.join(' ')).toContain('heat or cool')
    // Back to the full default shape
    expect(deviceTypeWith).not.toHaveBeenCalled()
    expect(thermostat.systemMode).toBe(1)
    expect(thermostat.minSetpointDeadBand).toBe(20)
  })
})

describe('on Homebridge without deviceRequirements (v2.3.x)', () => {
  it('warns, keeps the plain device type, and reverts the STATE to the full default', () => {
    const { log, thermostat, deviceTypeWith } = build(
      { thermostatRemoveAutoMode: true },
      { withRequirements: false },
    )

    expect(vi.mocked(log.warn).mock.calls.join(' ')).toContain('v2.4.0')
    expect(deviceTypeWith).not.toHaveBeenCalled()

    // ⚠️ The state has to revert too: Homebridge will detect Heating, Cooling
    // AND AutoMode from the setpoints, so the declared state must match that -
    // shipping the no-auto state against auto-detected features would fail
    expect(thermostat.minSetpointDeadBand).toBe(20)
    expect(thermostat.systemMode).toBe(1)
  })
})
