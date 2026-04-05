/**
 * Power Strip Accessory Class
 *
 * This demonstrates a composed device with multiple independent child endpoints (parts).
 * The parent uses BridgedNode as a non-controllable container, and each outlet is a
 * child endpoint. In Apple Home, this appears as a single accessory that can be
 * expanded into separate tiles for independent control.
 *
 * This uses the Homebridge Matter API's `parts` feature to create true sub-endpoint
 * composed devices, where each part is a child of the parent endpoint.
 *
 * Note: In Apple Home, the child accessories inherit their name from the parent
 * accessory's displayName, not from the individual part displayName. This is a
 * HomeKit limitation. The part displayName is used in the Homebridge UI.
 *
 * @see https://github.com/matter-js/matter.js/blob/main/docs/MIGRATION_GUIDE_08.md
 */

import type { API, ClusterStateMap, Logger } from 'homebridge'

import { BaseMatterAccessory } from '../BaseMatterAccessory.js'

const OUTLET_REGEX = /outlet-(\d+)/

export class PowerStripAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-power-strip'

    super(api, log, {
      UUID: api.matter.uuid.generate(serialNumber),
      displayName: 'Power Strip',
      deviceType: api.matter.deviceTypes.BridgedNode,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-POWER-STRIP-4X',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      // BridgedNode is a non-controllable container for composed devices.
      // No clusters or handlers on the parent — only the child parts below.
      // In Apple Home, the parts appear as a single accessory that can be
      // expanded into separate tiles.
      parts: [
        {
          id: 'outlet-1',
          displayName: 'Outlet 1',
          deviceType: api.matter.deviceTypes.OnOffOutlet,
          clusters: {
            onOff: { onOff: false },
          },
          handlers: {
            onOff: {
              on: async (_args, context) => this.handleOutletOn(context?.partId || 'outlet-1'),
              off: async (_args, context) => this.handleOutletOff(context?.partId || 'outlet-1'),
            },
          },
        },
        {
          id: 'outlet-2',
          displayName: 'Outlet 2',
          deviceType: api.matter.deviceTypes.OnOffOutlet,
          clusters: {
            onOff: { onOff: false },
          },
          handlers: {
            onOff: {
              on: async (_args, context) => this.handleOutletOn(context?.partId || 'outlet-2'),
              off: async (_args, context) => this.handleOutletOff(context?.partId || 'outlet-2'),
            },
          },
        },
        {
          id: 'outlet-3',
          displayName: 'Outlet 3',
          deviceType: api.matter.deviceTypes.OnOffOutlet,
          clusters: {
            onOff: { onOff: false },
          },
          handlers: {
            onOff: {
              on: async (_args, context) => this.handleOutletOn(context?.partId || 'outlet-3'),
              off: async (_args, context) => this.handleOutletOff(context?.partId || 'outlet-3'),
            },
          },
        },
        {
          id: 'outlet-4',
          displayName: 'Outlet 4',
          deviceType: api.matter.deviceTypes.OnOffOutlet,
          clusters: {
            onOff: { onOff: false },
          },
          handlers: {
            onOff: {
              on: async (_args, context) => this.handleOutletOn(context?.partId || 'outlet-4'),
              off: async (_args, context) => this.handleOutletOff(context?.partId || 'outlet-4'),
            },
          },
        },
      ],
    })

    this.logInfo('initialized with 4 independent outlet endpoints.')
  }

  /**
   * Handler for individual outlet ON command
   * Called when a specific outlet is turned on from the Home app
   */
  private async handleOutletOn(partId: string): Promise<void> {
    const outletNumber = this.getOutletNumber(partId)
    this.logInfo(`Outlet ${outletNumber} turned ON`)

    // TODO: Send command to actual power strip hardware
    // await myPowerStripAPI.turnOnOutlet(outletNumber)
  }

  /**
   * Handler for individual outlet OFF command
   * Called when a specific outlet is turned off from the Home app
   */
  private async handleOutletOff(partId: string): Promise<void> {
    const outletNumber = this.getOutletNumber(partId)
    this.logInfo(`Outlet ${outletNumber} turned OFF`)

    // TODO: Send command to actual power strip hardware
    // await myPowerStripAPI.turnOffOutlet(outletNumber)
  }

  /**
   * Extract outlet number from part ID
   */
  private getOutletNumber(partId: string): number {
    const match = partId.match(OUTLET_REGEX)
    return match ? Number.parseInt(match[1], 10) : 0
  }

  /**
   * Turn on a specific outlet programmatically
   * Use this to update outlet state from external sources (API, webhooks, etc.)
   *
   * @param outletNumber - Outlet number (1-4)
   */
  public async turnOnOutlet(outletNumber: 1 | 2 | 3 | 4): Promise<void> {
    const partId = `outlet-${outletNumber}`
    this.logInfo(`Programmatically turning ON outlet ${outletNumber}`)

    await this.updateState(this.api.matter.clusterNames.OnOff, { onOff: true }, partId)
  }

  /**
   * Turn off a specific outlet programmatically
   * Use this to update outlet state from external sources (API, webhooks, etc.)
   *
   * @param outletNumber - Outlet number (1-4)
   */
  public async turnOffOutlet(outletNumber: 1 | 2 | 3 | 4): Promise<void> {
    const partId = `outlet-${outletNumber}`
    this.logInfo(`Programmatically turning OFF outlet ${outletNumber}`)

    await this.updateState(this.api.matter.clusterNames.OnOff, { onOff: false }, partId)
  }

  /**
   * Toggle a specific outlet
   *
   * @param outletNumber - Outlet number (1-4)
   */
  public async toggleOutlet(outletNumber: 1 | 2 | 3 | 4): Promise<void> {
    const currentState = await this.getOutletState(outletNumber)

    if (currentState) {
      await this.turnOffOutlet(outletNumber)
    } else {
      await this.turnOnOutlet(outletNumber)
    }
  }

  /**
   * Get the current state of a specific outlet
   *
   * @param outletNumber - Outlet number (1-4)
   * @returns Current on/off state of the outlet
   */
  public async getOutletState(outletNumber: 1 | 2 | 3 | 4): Promise<boolean> {
    const partId = `outlet-${outletNumber}`

    const state = await this.readState('onOff', partId)

    return state?.onOff === true
  }

  /**
   * Get the state of all outlets
   *
   * @returns Object containing state of all outlets
   */
  public async getAllOutletStates(): Promise<Record<string, boolean>> {
    return {
      outlet1: await this.getOutletState(1),
      outlet2: await this.getOutletState(2),
      outlet3: await this.getOutletState(3),
      outlet4: await this.getOutletState(4),
    }
  }

  /**
   * Update the state of a specific outlet from external source
   * (e.g., when outlet state changes via physical button or other controller)
   *
   * @param outletNumber - Outlet number (1-4)
   * @param isOn - New state of the outlet
   */
  public async updateOutletStateFromExternal(outletNumber: 1 | 2 | 3 | 4, isOn: boolean): Promise<void> {
    const partId = `outlet-${outletNumber}`
    this.logInfo(`Outlet ${outletNumber} state updated from external source: ${isOn ? 'ON' : 'OFF'}`)

    await this.updateState(this.api.matter.clusterNames.OnOff, { onOff: isOn }, partId)
  }

  /**
   * Update all outlet states from external source
   *
   * @param states - Object containing new states for all outlets
   * @param states.outlet1 - State for outlet 1
   * @param states.outlet2 - State for outlet 2
   * @param states.outlet3 - State for outlet 3
   * @param states.outlet4 - State for outlet 4
   */
  public async updateAllOutletStatesFromExternal(states: {
    outlet1: boolean
    outlet2: boolean
    outlet3: boolean
    outlet4: boolean
  }): Promise<void> {
    this.logInfo('All outlet states updated from external source.')

    for (let i = 1; i <= 4; i++) {
      const key = `outlet${i}` as keyof typeof states
      const partId = `outlet-${i}`

      await this.updateState(this.api.matter.clusterNames.OnOff, { onOff: states[key] }, partId)
    }
  }

  /**
   * Override updateState to support partId parameter with typed overloads
   */
  protected async updateState<K extends keyof ClusterStateMap>(cluster: K, attributes: Partial<ClusterStateMap[K]>, partId?: string): Promise<void>
  protected async updateState(cluster: string, attributes: Record<string, unknown>, partId?: string): Promise<void>
  protected async updateState(cluster: string, attributes: Record<string, unknown>, partId?: string): Promise<void> {
    await this.api.matter.updateAccessoryState(this.UUID, cluster, attributes, partId)
    if (partId) {
      this.logDebug(`Updated ${cluster} state for part ${partId}:`, attributes)
    } else {
      this.logDebug(`Updated ${cluster} state:`, attributes)
    }
  }
}
