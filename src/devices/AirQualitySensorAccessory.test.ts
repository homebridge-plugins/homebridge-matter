import type { API, Logger } from 'homebridge'

import { describe, expect, it, vi } from 'vitest'

import { AirQualitySensorAccessory } from './AirQualitySensorAccessory.js'

/**
 * A plain Matter air quality cluster only accepts Unknown (0), Good (1) and
 * Poor (4). Fair, Moderate, Very Poor and Extremely Poor each need an optional
 * cluster feature this device type does not enable, so matter.js refuses them.
 * The example used to say all seven worked (#7).
 */
function build() {
  const updateAccessoryState = vi.fn()
  const api = {
    matter: {
      uuid: {
        generate: (value: string) => `uuid-${value}`,
      },
      deviceTypes: {
        AirQualitySensor: { name: 'AirQualitySensorDevice' },
      },
      updateAccessoryState,
    },
  } as unknown as API
  const log = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger
  return {
    device: new AirQualitySensorAccessory(api, log),
    updateAccessoryState,
    log,
  }
}

describe('setting the air quality', () => {
  it('declares a level the cluster accepts', () => {
    const { device } = build()
    const airQuality = device.toAccessory().clusters?.airQuality as Record<string, unknown>

    expect([0, 1, 4]).toContain(airQuality.airQuality)
  })

  it.each([0, 1, 4] as const)('sends level %s', async (level) => {
    const { device, updateAccessoryState } = build()

    await device.updateAirQuality(level)

    expect(updateAccessoryState).toHaveBeenCalledWith('uuid-matter-air-quality-sensor', 'airQuality', { airQuality: level }, undefined)
  })

  it.each([2, 3, 5, 6])('warns about level %s instead of sending it', async (level) => {
    const { device, updateAccessoryState, log } = build()

    await device.updateAirQuality(level as never)

    expect(updateAccessoryState).not.toHaveBeenCalled()
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('optional Matter feature'))
  })
})
