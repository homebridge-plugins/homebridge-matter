/**
 * Door Lock Device (Matter Spec § 8.1)
 *
 * A lock that can be locked and unlocked remotely.
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
        // Lock state: 0=NotFullyLocked, 1=Locked, 2=Unlocked
        lockState: 2, // Unlocked

        // Lock type: 0=Deadbolt, 1=Magnetic, 2=Other, etc.
        lockType: 0, // Deadbolt

        // Actuator enabled (can be locked/unlocked)
        actuatorEnabled: true,
      },
    },

    handlers: {
      doorLock: {
        // Called when user locks the door
        lockDoor: async () => {
          log.info('[Door Lock] ✓ Handler `lockDoor` called - Locking door')

          // Update the lock state to "Locked" (1)
          await api.matter.updateAccessoryState(
            api.matter.uuid.generate('matter-door-lock'),
            'doorLock',
            { lockState: 1 },
          )
        },

        // Called when user unlocks the door
        unlockDoor: async () => {
          log.info('[Door Lock] ✓ Handler `unlockDoor` called - Unlocking door')

          // Update the lock state to "Unlocked" (2)
          await api.matter.updateAccessoryState(
            api.matter.uuid.generate('matter-door-lock'),
            'doorLock',
            { lockState: 2 },
          )
        },
      },
    },
  })

  return accessories
}
