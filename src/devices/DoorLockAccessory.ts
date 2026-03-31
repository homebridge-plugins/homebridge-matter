/**
 * Door Lock Accessory Class
 */

import type { API, Logger } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

/**
 * Door Lock Accessory Class
 *
 * Note on PIN codes: The Matter spec supports PIN credential features (pinCode field
 * in lock/unlock requests), but Apple Home does not expose a keypad UI for entering
 * PINs. Lock/unlock commands from Apple Home are sent without a PIN. Other Matter
 * controllers (e.g. some Android apps) may support PIN entry. For simplicity, this
 * example does not use the PIN credential feature.
 */
export class DoorLockAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-door-lock'
    super(api, log, {
      UUID: api.matter.uuid.generate(serialNumber),
      displayName: 'Door Lock',
      deviceType: api.matter.deviceTypes.DoorLock,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-LOCK-DOOR',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        doorLock: {
          lockState: api.matter.types.DoorLock.LockState.Unlocked,
          lockType: api.matter.types.DoorLock.LockType.DeadBolt,
          actuatorEnabled: true,
          operatingMode: api.matter.types.DoorLock.OperatingMode.Normal,

          // Required by the Matter spec (constraint: 1-255) for DoorLock validation at startup.
          // These only take effect when a PIN-capable controller sends credentials —
          // Apple Home does not send PINs, so these are functionally inert in practice.
          wrongCodeEntryLimit: 3, // lock out after 3 wrong PIN attempts
          userCodeTemporaryDisableTime: 10, // 10 second cooldown after lockout
        },
      },

      handlers: {
        doorLock: {
          lockDoor: async () => this.handleLock(),
          unlockDoor: async () => this.handleUnlock(),
        },
      },
    })

    this.logInfo('initialized.')
  }

  private async handleLock(): Promise<void> {
    this.logInfo('locking door.')

    // Example: Check if door is closed before locking
    // if (this.isDoorOpen) {
    //   throw new MatterStatus.InvalidInState('Cannot lock door while it is open')
    // }

    // Example: Check if lock mechanism is already in use
    // if (this.isLockMotorActive) {
    //   throw new MatterStatus.Busy('Lock mechanism is currently in use')
    // }

    // Example: Lock with timeout and error handling
    // try {
    //   await this.lockAPI.lock({ timeout: 10000 })
    // } catch (error) {
    //   if (error.code === 'LOCK_JAMMED') {
    //     throw new MatterStatus.Failure('Lock is jammed - check door alignment')
    //   }
    //   if (error.code === 'ETIMEDOUT') {
    //     throw new MatterStatus.Timeout('Lock motor did not respond within 10 seconds')
    //   }
    //   throw error
    // }

    this.logInfo('locked.')
  }

  private async handleUnlock(): Promise<void> {
    this.logInfo('unlocking door.')

    // Example: Check if user has permission to unlock
    // if (!this.userHasUnlockPermission) {
    //   throw new MatterStatus.PermissionDenied('User does not have permission to unlock')
    // }

    // Example: Check if security system prevents unlocking
    // if (this.isSecuritySystemArmed) {
    //   throw new MatterStatus.InvalidInState('Cannot unlock while security system is armed')
    // }

    // Example: Check time-based access restrictions
    // const currentHour = new Date().getHours()
    // if (currentHour < 6 || currentHour > 22) {
    //   throw new MatterStatus.PermissionDenied('Remote unlocking disabled during night hours')
    // }

    this.logInfo('unlocked.')
  }

  public async updateLockState(state: 0 | 1 | 2): Promise<void> {
    // 0 = Not fully locked, 1 = Locked, 2 = Unlocked
    await this.updateState('doorLock', { lockState: state })
    const stateStr = ['Not Fully Locked', 'Locked', 'Unlocked'][state]
    this.logInfo(`lock state: ${stateStr}.`)
  }
}
