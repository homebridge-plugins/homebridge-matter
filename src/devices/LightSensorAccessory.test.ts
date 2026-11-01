import type { API, Logger } from 'homebridge'

import { describe, expect, it, vi } from 'vitest'

import { LightSensorAccessory } from './LightSensorAccessory.js'

/**
 * Matter's illuminance scale is 10000 × log10(lux) + 1, and 0 means too low to
 * measure. The example used to leave out the + 1, and sent a negative value for
 * a reading below 1 lux.
 */
function build() {
  const updateAccessoryState = vi.fn()
  const api = {
    matter: {
      uuid: {
        generate: (value: string) => `uuid-${value}`,
      },
      deviceTypes: {
        LightSensor: { name: 'LightSensorDevice' },
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
    device: new LightSensorAccessory(api, log),
    updateAccessoryState,
  }
}

describe('setting the light level', () => {
  it.each([
    [1, 1],
    [10, 10001],
    [1000, 30001],
    [0.5, 0],
  ])('%s lux is sent as %s', async (lux, measuredValue) => {
    const { device, updateAccessoryState } = build()

    await device.updateIlluminance(lux)

    expect(updateAccessoryState).toHaveBeenCalledWith('uuid-matter-light-sensor', 'illuminanceMeasurement', { measuredValue }, undefined)
  })
})
