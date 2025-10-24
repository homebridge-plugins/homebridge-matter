/**
 * Door Lock Accessory Class
 */

import type { API, Logger, MatterRequests } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class DoorLockAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'LOCK-001'
    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
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
        },
      },

      handlers: {
        doorLock: {
          lockDoor: async (request: MatterRequests.LockDoor) => this.handleLock(request),
          unlockDoor: async (request: MatterRequests.UnlockDoor) => this.handleUnlock(request),
        },
      },
    })

    this.logInfo('initialized.')
  }

  private async handleLock(request: MatterRequests.LockDoor): Promise<void> {
    const { pinCode } = request
    this.logInfo(`locking door ${pinCode ? '(with pin)' : ''}.`)
    // TODO: await myLockAPI.lock(pinCode)
  }

  private async handleUnlock(request: MatterRequests.UnlockDoor): Promise<void> {
    const { pinCode } = request
    this.logInfo(`unlocking door ${pinCode ? '(with pin)' : ''}.`)
    // TODO: await myLockAPI.unlock(pinCode)
  }

  public updateLockState(state: 0 | 1 | 2): void {
    // 0 = Not fully locked, 1 = Locked, 2 = Unlocked
    this.updateState('doorLock', { lockState: state })
    const stateStr = ['Not Fully Locked', 'Locked', 'Unlocked'][state]
    this.logInfo((`lock state: ${stateStr}.`))
  }
}
