/**
 * Door Lock Device (Matter Spec § 8.1)
 *
 * A lock that can be locked and unlocked remotely.
 */

import { MatterTypes } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerDoorLock(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  if (!config.enableDoorLock) {
    return accessories
  }

  // Generate UUID once and reuse in handlers
  const doorLockUuid = api.matter.uuid.generate('matter-door-lock')

  accessories.push({
    uuid: doorLockUuid,
    displayName: 'Door Lock',
    deviceType: api.matter.deviceTypes.DoorLock,
    serialNumber: 'LOCK-001',
    manufacturer: 'Matter Examples',
    model: 'DoorLock v1',

    // Optional: Persistent storage for custom data (survives Homebridge restarts)
    // Useful for storing device IDs, API credentials, cached state, etc.
    // Access later via configureMatterAccessory() when Homebridge restarts
    // context: {
    //   lockDeviceId: 'abc123',
    //   apiEndpoint: 'https://api.mylock.com',
    //   lastKnownState: 2, // 2 = Unlocked
    // },

    clusters: {
      doorLock: {
        // Lock state using MatterTypes enum for type safety
        lockState: MatterTypes.DoorLock.LockState.Unlocked, // Unlocked (initial state)

        // Lock type using MatterTypes enum
        lockType: MatterTypes.DoorLock.LockType.DeadBolt,

        // Actuator enabled (can be locked/unlocked remotely)
        actuatorEnabled: true,
      },
    },

    handlers: {
      doorLock: {
        // Called when user locks the door via Home app
        lockDoor: async () => {
          log.info('[Door Lock] ✓ Handler `lockDoor` called - Locking door')

          // TODO: Add your actual lock device control logic here
          // Example: await myLockAPI.lock()

          // Update the Matter state to reflect the lock is now locked
          return api.matter.updateAccessoryState(
            doorLockUuid,
            'doorLock',
            { lockState: MatterTypes.DoorLock.LockState.Locked },
          )
        },

        // Called when user unlocks the door via Home app
        unlockDoor: async () => {
          log.info('[Door Lock] ✓ Handler `unlockDoor` called - Unlocking door')

          // TODO: Add your actual lock device control logic here
          // Example: await myLockAPI.unlock()

          // Update the Matter state to reflect the lock is now unlocked
          return api.matter.updateAccessoryState(
            doorLockUuid,
            'doorLock',
            { lockState: MatterTypes.DoorLock.LockState.Unlocked },
          )
        },
      },
    },
  })

  return accessories
}
