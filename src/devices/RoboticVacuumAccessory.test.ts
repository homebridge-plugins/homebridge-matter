import type { API, Logger, PlatformConfig } from 'homebridge'

import { describe, expect, it, vi } from 'vitest'

import { RoboticVacuumAccessory } from './RoboticVacuumAccessory.js'

/**
 * DirectModeChange lets a controller change the clean mode mid-run. It changes
 * what the vacuum advertises, so it stays off unless the config asks for it -
 * turning it on for everyone would alter an accessory users already have paired.
 */
function build(config?: Partial<PlatformConfig>) {
  const api = {
    matter: {
      uuid: {
        generate: (value: string) => `uuid-${value}`,
      },
      deviceTypes: {
        RoboticVacuumCleaner: { name: 'RoboticVacuumCleanerDevice' },
      },
      updateAccessoryState: vi.fn(),
    },
  } as unknown as API
  const log = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger
  const device = new RoboticVacuumAccessory(api, log, config
    ? { platform: 'Matter', ...config }
    : undefined)
  device.shutdown()
  return device.toAccessory()
}

describe('changing the clean mode while cleaning', () => {
  it('is off by default', () => {
    expect(build().features?.rvcCleanMode?.directModeChange).toBe(false)
  })

  it('is on when the config asks for it', () => {
    expect(build({ robotVacuumDirectModeChange: true }).features?.rvcCleanMode?.directModeChange).toBe(true)
  })

  it('keeps a clean mode handler to receive the mid-run changes', () => {
    expect(build({ robotVacuumDirectModeChange: true }).handlers?.rvcCleanMode?.changeToMode).toBeTypeOf('function')
  })
})

/**
 * The room types come from Matter's Common Area Namespace. The example used to
 * send Bedroom for the living room, Breakfast Room for the kitchen and Back Door
 * for the bedroom.
 */
describe('the rooms', () => {
  it('use the matching area types', () => {
    const areas = build().clusters?.serviceArea?.supportedAreas as Array<{ areaInfo: { locationInfo: { locationName: string, areaType: number } } }>
    const types = Object.fromEntries(areas.map(area => [area.areaInfo.locationInfo.locationName, area.areaInfo.locationInfo.areaType]))
    expect(types).toEqual({
      'Living Room': 52,
      'Kitchen': 47,
      'Bedroom': 7,
      'Bathroom': 6,
    })
  })
})

describe('the battery', () => {
  it('reports the power source as active', () => {
    expect(build().clusters?.powerSource?.status).toBe(1)
  })
})
