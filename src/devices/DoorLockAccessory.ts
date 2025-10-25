/**
 * Door Lock Accessory Class
 */

import type { API, Logger } from 'homebridge'

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
          lockDoor: async () => this.handleLock(),
          unlockDoor: async () => this.handleUnlock(),
        },
      },
    })

    this.logInfo('initialized.')
  }

  private async handleLock(): Promise<void> {
    this.logInfo('locked.')
  }

  private async handleUnlock(): Promise<void> {
    this.logInfo('unlocked.')
  }

  public updateLockState(state: 0 | 1 | 2): void {
    // 0 = Not fully locked, 1 = Locked, 2 = Unlocked
    this.updateState('doorLock', { lockState: state })
    const stateStr = ['Not Fully Locked', 'Locked', 'Unlocked'][state]
    this.logInfo(`lock state: ${stateStr}.`)
  }
}
