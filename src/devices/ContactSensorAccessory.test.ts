import type { API, Logger } from 'homebridge'

import { describe, expect, it, vi } from 'vitest'

import { ContactSensorAccessory } from './ContactSensorAccessory.js'

/**
 * A power source's status uses 1 for Active - 0 is Unspecified. The example
 * used to send 0 with an "Active" comment.
 */
function build() {
  const api = {
    matter: {
      uuid: {
        generate: (value: string) => `uuid-${value}`,
      },
      deviceTypes: {
        ContactSensor: { name: 'ContactSensorDevice' },
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
  return new ContactSensorAccessory(api, log).toAccessory()
}

describe('the battery', () => {
  it('reports the power source as active', () => {
    expect(build().clusters?.powerSource?.status).toBe(1)
  })
})
