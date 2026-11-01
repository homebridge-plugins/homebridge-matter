import type { API, Logger } from 'homebridge'

import { describe, expect, it, vi } from 'vitest'

import { AirQualitySensorAccessory } from './AirQualitySensorAccessory.js'

/**
 * Fair, Moderate, Very Poor and Extremely Poor each need an optional feature on
 * the air quality cluster. Homebridge v2.5.0 turns them all on for this device
 * type, so the example passes every level through (#7). It used to refuse the
 * four that a plain cluster rejected.
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
  it.each([0, 1, 2, 3, 4, 5, 6] as const)('sends level %s', async (level) => {
    const { device, updateAccessoryState, log } = build()

    await device.updateAirQuality(level)

    expect(updateAccessoryState).toHaveBeenCalledWith('uuid-matter-air-quality-sensor', 'airQuality', { airQuality: level }, undefined)
    expect(log.warn).not.toHaveBeenCalled()
  })
})

/**
 * In Matter's concentration clusters, 4 is µg/m³ and 0 is ppm. The particulate
 * readings are in µg/m³, but the example used to send 0.
 */
describe('the particulate readings', () => {
  it.each(['pm25ConcentrationMeasurement', 'pm10ConcentrationMeasurement'] as const)('%s is in µg/m³', (cluster) => {
    expect(build().device.toAccessory().clusters?.[cluster]?.measurementUnit).toBe(4)
  })
})
