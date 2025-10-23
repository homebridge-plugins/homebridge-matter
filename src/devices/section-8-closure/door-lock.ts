/**
 * Door Lock Device (Matter Spec § 8.1)
 *
 * A lock that can be locked and unlocked remotely.
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - DoorLock cluster with lock/unlock commands
 * - Using api.matter.types for type-safe enum values
 */

import type { DeviceContext } from '../types.js'

export function registerDoorLock(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  if (!config.enableDoorLock) {
    return accessories
  }

  accessories.push({
    uuid: api.matter.uuid.generate('matter-door-lock'),
    displayName: 'Door Lock',
    deviceType: api.matter.deviceTypes.DoorLock,
    serialNumber: 'LOCK-001',
    manufacturer: 'Matter Examples',
    model: 'DoorLock v1',

    clusters: {
      doorLock: {
        lockState: api.matter.types.DoorLock.LockState.Unlocked,
        lockType: api.matter.types.DoorLock.LockType.DeadBolt,
        actuatorEnabled: true,
      },
    },

    handlers: {
      doorLock: {
        lockDoor: async () => {
          log.info('[Door Lock] Locking door')
          // TODO: await myLockAPI.lock()
        },

        unlockDoor: async () => {
          log.info('[Door Lock] Unlocking door')
          // TODO: await myLockAPI.unlock()
        },
      },
    },
  })

  return accessories
}
