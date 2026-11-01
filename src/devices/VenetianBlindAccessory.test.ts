import type { API, Logger } from 'homebridge'

import { describe, expect, it, vi } from 'vitest'

import { VenetianBlindAccessory } from './VenetianBlindAccessory.js'

/**
 * In Matter's window covering product types, 12 is an interior Venetian blind.
 * The example used to send 8, which is a sheer shade.
 */
function build() {
  const api = {
    matter: {
      uuid: {
        generate: (value: string) => `uuid-${value}`,
      },
      deviceTypes: {
        WindowCovering: { name: 'WindowCoveringDevice' },
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
  return new VenetianBlindAccessory(api, log).toAccessory()
}

describe('the product type', () => {
  it('is an interior venetian blind', () => {
    expect(build().clusters?.windowCovering?.endProductType).toBe(12)
  })
})
