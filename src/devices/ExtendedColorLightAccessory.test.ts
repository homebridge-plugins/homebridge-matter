import type { API, Logger } from 'homebridge'

import { describe, expect, it, vi } from 'vitest'

import { ExtendedColorLightAccessory } from './ExtendedColorLightAccessory.js'

/**
 * Matter stores the x and y colour coordinates as value / 65536 (up to 65279).
 * The example used to divide by 65535.
 */
function build() {
  const api = {
    matter: {
      uuid: {
        generate: (value: string) => `uuid-${value}`,
      },
      deviceTypes: {
        ExtendedColorLight: { name: 'ExtendedColorLightDevice' },
      },
      types: {
        ColorControl: {
          ColorMode: { CurrentHueAndCurrentSaturation: 0 },
        },
      },
      clusterNames: { ColorControl: 'colorControl' },
      updateAccessoryState: vi.fn(),
    },
  } as unknown as API
  const log = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger
  return {
    accessory: new ExtendedColorLightAccessory(api, log).toAccessory(),
    log,
  }
}

describe('setting an xy colour', () => {
  it('converts with the 65536 scale', async () => {
    const { accessory, log } = build()

    await accessory.handlers?.colorControl?.moveToColorLogic?.({ targetX: 60001, targetY: 32768, transitionTime: 0 })

    expect(vi.mocked(log.info).mock.calls.flat().join('\n')).toContain('(0.9155, 0.5000)')
  })
})
