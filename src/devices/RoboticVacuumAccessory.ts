/* global NodeJS */

/**
 * Robotic Vacuum Cleaner Accessory Class
 *
 * This is a comprehensive example demonstrating all available features
 * of the RoboticVacuumCleaner device type including:
 * - Multiple run modes (Idle, Cleaning, Mapping)
 * - Multiple clean modes (Vacuum, Mop, Vacuum & Mop, Deep Clean)
 * - Operational state management with realistic transitions
 * - Service area (room) support
 *
 * IMPORTANT: Platform Matter accessories
 * =======================================
 * This vacuum is registered as a platform accessory using
 * api.matter.registerPlatformAccessories(), which works the same as HAP.
 * Platform accessories are registered synchronously and are immediately ready for use.
 *
 * Demo behavior:
 * - Start/Resume: Sets run mode to "Cleaning", runs for 15/10 seconds, then returns to dock
 * - Return to dock: Immediately sets "Idle" mode, then Seeking (5s) → Charging (3s) → Docked
 * - Stop: Immediately stops and resets to "Idle" mode
 * - Pause: Cancels automatic completion timer, keeps "Cleaning" mode
 */

import type { API, Logger } from 'homebridge'

import { MatterStatus } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class RoboticVacuumAccessory extends BaseMatterAccessory {
  private activeTimers: NodeJS.Timeout[] = []
  private currentOperationalState = 66 // Track current state (start docked)

  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-robot-vacuum'
    super(api, log, {
      UUID: api.matter.uuid.generate(serialNumber),
      displayName: 'Robot Vacuum',
      deviceType: api.matter.deviceTypes.RoboticVacuumCleaner,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-VACUUM-ROBOTIC',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        // Power Source: Battery status and percentage
        powerSource: {
          status: 0, // 0 = Active
          order: 0, // Primary power source
          description: 'Battery',
          batPercentRemaining: 100, // 0-200, where 200 = 100% (0.5% increments)
          batChargeLevel: 2, // 0 = Ok, 1 = Warning, 2 = Critical
          batReplaceability: 1, // 0 = Unspecified, 1 = Not replaceable, 2 = User replaceable, 3 = Factory replaceable
        },

        // Run Mode: Controls what the vacuum is doing (Idle, Cleaning, Mapping)
        rvcRunMode: {
          supportedModes: [
            { label: 'Idle', mode: 0, modeTags: [{ value: 16384 }] }, // RvcRunMode.ModeTag.Idle
            { label: 'Cleaning', mode: 1, modeTags: [{ value: 16385 }] }, // RvcRunMode.ModeTag.Cleaning
            { label: 'Mapping', mode: 2, modeTags: [{ value: 16386 }] }, // RvcRunMode.ModeTag.Mapping
          ],
          currentMode: 0,
        },

        // Clean Mode: Controls HOW the vacuum cleans
        // You can combine semantic tags (0-9) with functional tags (16384-16386)
        // Available semantic tags: Auto, Quick, Quiet, LowNoise, LowEnergy, Vacation, Min, Max, Night, Day
        // Available functional tags: DeepClean, Vacuum, Mop
        rvcCleanMode: {
          supportedModes: [
            // Basic functional modes
            { label: 'Vacuum', mode: 0, modeTags: [{ value: 16385 }] }, // Vacuum
            { label: 'Mop', mode: 1, modeTags: [{ value: 16386 }] }, // Mop
            { label: 'Vacuum & Mop', mode: 2, modeTags: [{ value: 16385 }, { value: 16386 }] }, // Both

            // Deep clean modes
            { label: 'Deep Clean', mode: 3, modeTags: [{ value: 16384 }] }, // DeepClean
            { label: 'Deep Vacuum', mode: 4, modeTags: [{ value: 16384 }, { value: 16385 }] }, // DeepClean + Vacuum
            { label: 'Deep Mop', mode: 5, modeTags: [{ value: 16384 }, { value: 16386 }] }, // DeepClean + Mop

            // Intensity modes
            { label: 'Quick Clean', mode: 6, modeTags: [{ value: 1 }, { value: 16385 }] }, // Quick + Vacuum
            { label: 'Max Clean', mode: 7, modeTags: [{ value: 7 }, { value: 16385 }] }, // Max + Vacuum
            { label: 'Min Clean', mode: 8, modeTags: [{ value: 6 }, { value: 16385 }] }, // Min + Vacuum

            // Quiet modes
            { label: 'Quiet Vacuum', mode: 9, modeTags: [{ value: 2 }, { value: 16385 }] }, // Quiet + Vacuum
            { label: 'Quiet Mop', mode: 10, modeTags: [{ value: 2 }, { value: 16386 }] }, // Quiet + Mop
            { label: 'Night Mode', mode: 11, modeTags: [{ value: 8 }, { value: 16385 }] }, // Night + Vacuum

            // Energy efficient
            { label: 'Eco Vacuum', mode: 12, modeTags: [{ value: 4 }, { value: 16385 }] }, // LowEnergy + Vacuum
            { label: 'Eco Mop', mode: 13, modeTags: [{ value: 4 }, { value: 16386 }] }, // LowEnergy + Mop

            // Auto mode
            { label: 'Auto', mode: 14, modeTags: [{ value: 0 }, { value: 16385 }] }, // Auto + Vacuum
          ],
          currentMode: 0, // start with basic Vacuum
        },

        // Operational State: Current state (Stopped, Running, Paused, Error, etc.)
        rvcOperationalState: {
          operationalStateList: [
            { operationalStateId: 0 }, // stopped (standard label from Matter spec)
            { operationalStateId: 1 }, // running
            { operationalStateId: 2 }, // paused
            { operationalStateId: 3 }, // error
            { operationalStateId: 64 }, // seeking charger
            { operationalStateId: 65 }, // charging
            { operationalStateId: 66 }, // docked
            { operationalStateId: 67 }, // emptying dust bin
            { operationalStateId: 68 }, // cleaning mop
            { operationalStateId: 69 }, // filling water tank
            { operationalStateId: 70 }, // updating maps
          ],
          operationalState: 66, // start docked
        },

        // Service Area: Room/zone selection for targeted cleaning
        serviceArea: {
          supportedMaps: [], // empty array - we don't use map features
          supportedAreas: [
            {
              areaId: 0,
              mapId: null, // required: must be null when supportedMaps is empty
              areaInfo: {
                locationInfo: {
                  locationName: 'Living Room',
                  floorNumber: 0,
                  areaType: 7, // AreaNamespaceTag.LivingRoom
                },
                landmarkInfo: null,
              },
            },
            {
              areaId: 1,
              mapId: null,
              areaInfo: {
                locationInfo: {
                  locationName: 'Kitchen',
                  floorNumber: 0,
                  areaType: 10, // AreaNamespaceTag.Kitchen
                },
                landmarkInfo: null,
              },
            },
            {
              areaId: 2,
              mapId: null,
              areaInfo: {
                locationInfo: {
                  locationName: 'Bedroom',
                  floorNumber: 0,
                  areaType: 2, // AreaNamespaceTag.Bedroom
                },
                landmarkInfo: null,
              },
            },
            {
              areaId: 3,
              mapId: null,
              areaInfo: {
                locationInfo: {
                  locationName: 'Bathroom',
                  floorNumber: 0,
                  areaType: 6, // AreaNamespaceTag.Bathroom
                },
                landmarkInfo: null,
              },
            },
          ],
          selectedAreas: [0, 1, 2, 3], // all areas selected by default
        },
      },

      handlers: {
        rvcRunMode: {
          // Handler types are automatically inferred from ClusterHandlerMap
          changeToMode: async request => this.handleChangeRunMode(request),
        },
        rvcCleanMode: {
          changeToMode: async request => this.handleChangeCleanMode(request),
        },
        // Note: rvcOperationalState only supports pause, resume, and goHome handlers.
        // Start/stop is controlled through rvcRunMode.changeToMode instead.
        rvcOperationalState: {
          pause: async () => this.handlePause(),
          resume: async () => this.handleResume(),
          goHome: async () => this.handleGoHome(),
        },
        serviceArea: {
          selectAreas: async request => this.handleSelectAreas(request),
          skipArea: async request => this.handleSkipArea(request),
        },
      },
    })

    this.logInfo('initialized and ready.')
  }

  private async handleChangeRunMode(request: { newMode: number }): Promise<void> {
    this.logInfo(`ChangeToMode (run) request received: ${JSON.stringify(request)}`)
    const { newMode } = request
    const modeStr = ['Idle', 'Cleaning', 'Mapping'][newMode] || `Unknown (mode=${newMode})`
    this.logInfo(`changing run mode to: ${modeStr}`)
    // TODO: await myVacuumAPI.setRunMode(newMode)

    // Clear any existing timers
    this.clearTimers()

    if (newMode === 1) {
      // Switching to Cleaning mode - start the vacuum
      await this.updateOperationalState(1) // Running
      this.scheduleCleaningCompletion(15) // Complete after 15 seconds
    } else if (newMode === 0) {
      // Switching to Idle mode - return to dock
      this.returnToDock()
    } else if (newMode === 2) {
      // Switching to Mapping mode - start mapping
      await this.updateOperationalState(1) // Running

      // Simulate mapping completion after 20 seconds
      const completionTimer = setTimeout(() => {
        this.logInfo('mapping completed, returning to dock.')
        this.returnToDock()
      }, 20000)

      this.activeTimers.push(completionTimer)
    }
  }

  private async handleChangeCleanMode(request: { newMode: number }): Promise<void> {
    this.logInfo(`ChangeToMode (clean) request received: ${JSON.stringify(request)}`)
    const { newMode } = request
    const modes = [
      'Vacuum',
      'Mop',
      'Vacuum & Mop',
      'Deep Clean',
      'Deep Vacuum',
      'Deep Mop',
      'Quick Clean',
      'Max Clean',
      'Min Clean',
      'Quiet Vacuum',
      'Quiet Mop',
      'Night Mode',
      'Eco Vacuum',
      'Eco Mop',
      'Auto',
    ]
    const modeStr = modes[newMode] || `Unknown (mode=${newMode})`
    this.logInfo(`changing clean mode to: ${modeStr}`)

    // Example: Check if device supports the requested cleaning mode
    // const supportedModes = [0, 1, 2, 6] // Only Vacuum, Mop, Vacuum&Mop, Quick Clean
    // if (!supportedModes.includes(newMode)) {
    //   throw new MatterStatus.InvalidAction(`Clean mode "${modeStr}" is not supported by this device`)
    // }

    // Example: Check if mopping is available (water tank attached)
    // const isMopMode = [1, 2, 5, 10, 13].includes(newMode) // modes that use mop
    // if (isMopMode && !this.isWaterTankAttached) {
    //   throw new MatterStatus.InvalidInState('Cannot use mop modes - water tank not attached')
    // }

    // TODO: await myVacuumAPI.setCleanMode(newMode)
  }

  private async handlePause(): Promise<void> {
    this.logInfo('pausing.')

    // Validate current state - cannot pause in maintenance or charging states
    const invalidStates = [65, 66, 67, 68, 69, 70] // Charging, Docked, EmptyingDustBin, CleaningMop, FillingWaterTank, UpdatingMaps
    if (invalidStates.includes(this.currentOperationalState)) {
      const stateNames: Record<number, string> = {
        65: 'Charging',
        66: 'Docked',
        67: 'Emptying Dust Bin',
        68: 'Cleaning Mop',
        69: 'Filling Water Tank',
        70: 'Updating Maps',
      }
      throw new MatterStatus.InvalidInState(
        `Cannot pause while in ${stateNames[this.currentOperationalState]} state`,
      )
    }

    // TODO: await myVacuumAPI.pause()
    this.clearTimers() // Clear cleaning completion timer
    await this.updateOperationalState(2) // Paused
  }

  private async handleResume(): Promise<void> {
    this.logInfo('resuming.')

    // Validate current state - cannot resume in maintenance, charging, or seeking states
    const invalidStates = [64, 65, 66, 67, 68, 69, 70] // SeekingCharger, Charging, Docked, EmptyingDustBin, CleaningMop, FillingWaterTank, UpdatingMaps
    if (invalidStates.includes(this.currentOperationalState)) {
      const stateNames: Record<number, string> = {
        64: 'Seeking Charger',
        65: 'Charging',
        66: 'Docked',
        67: 'Emptying Dust Bin',
        68: 'Cleaning Mop',
        69: 'Filling Water Tank',
        70: 'Updating Maps',
      }
      throw new MatterStatus.InvalidInState(
        `Cannot resume while in ${stateNames[this.currentOperationalState]} state`,
      )
    }

    // TODO: await myVacuumAPI.resume()

    // Clear any existing timers
    this.clearTimers()

    await this.updateRunMode(1) // Set to Cleaning mode
    await this.updateOperationalState(1) // Running
    this.scheduleCleaningCompletion(10) // Complete after 10 seconds (shorter since resuming)
  }

  private async handleGoHome(): Promise<void> {
    this.logInfo('goHome command received.')
    // TODO: await myVacuumAPI.goHome()

    // Clear any existing timers
    this.clearTimers()

    // Defer state updates to ensure handler completes first
    setImmediate(() => {
      // Set to Idle mode since we're ending the cleaning session
      this.updateRunMode(0)

      // Initiate return to dock sequence
      this.returnToDock()
    })
  }

  private async handleSelectAreas(request: { newAreas: number[] }): Promise<void> {
    this.logInfo(`SelectAreas request received: ${JSON.stringify(request)}`)
    const { newAreas } = request
    const areaNames = newAreas.map((id: number) =>
      ['Living Room', 'Kitchen', 'Bedroom', 'Bathroom'][id] || `Area ${id}`,
    )
    this.logInfo(`selecting areas: ${areaNames.join(', ')}`)

    // Example: Validate that all requested areas exist
    // const validAreaIds = [0, 1, 2, 3]
    // const invalidAreas = newAreas.filter((id: number) => !validAreaIds.includes(id))
    // if (invalidAreas.length > 0) {
    //   throw new MatterStatus.NotFound(`Area ID(s) not found: ${invalidAreas.join(', ')}`)
    // }

    // Example: Check if vacuum supports area selection
    // if (!this.supportsAreaSelection) {
    //   throw new MatterStatus.InvalidAction('This vacuum does not support area selection')
    // }

    // Example: Prevent selecting areas while vacuum is running
    // if (this.operationalState === 1) { // 1 = Running
    //   throw new MatterStatus.InvalidInState('Cannot change area selection while vacuum is running')
    // }

    // TODO: await myVacuumAPI.selectAreas(newAreas)
  }

  private async handleSkipArea(request: { skippedArea: number }): Promise<void> {
    this.logInfo(`SkipArea request received: ${JSON.stringify(request)}`)
    const { skippedArea } = request
    const areaName = ['Living Room', 'Kitchen', 'Bedroom', 'Bathroom'][skippedArea] || `Area ${skippedArea}`
    this.logInfo(`skipping area: ${areaName}`)
    // TODO: await myVacuumAPI.skipArea(skippedArea)
  }

  /**
   * Helper method to clear all active timers
   */
  private clearTimers(): void {
    this.activeTimers.forEach(timer => clearTimeout(timer))
    this.activeTimers = []
  }

  /**
   * Helper method to initiate return to dock sequence
   * Can be called synchronously from other handlers
   */
  private returnToDock(): void {
    this.logInfo('initiating return to dock sequence.')

    // Defer ALL state updates to ensure handler completes first
    setImmediate(async () => {
      // Start seeking charger directly (skip intermediate Stopped state)
      await this.updateOperationalState(64) // Seeking Charger

      // After 5 seconds, start charging
      const chargingTimer = setTimeout(async () => {
        this.logInfo('reached dock, now charging.')
        await this.updateOperationalState(65) // Charging

        // After 3 more seconds, fully docked
        const dockedTimer = setTimeout(() => {
          this.logInfo('fully charged and docked.')
          this.updateOperationalState(66) // Docked
        }, 3000)

        this.activeTimers.push(dockedTimer)
      }, 5000)

      this.activeTimers.push(chargingTimer)
    })
  }

  /**
   * Update Methods - Use these to update the vacuum state from your API/device
   *
   * Since this is a platform accessory, state updates work immediately after registration.
   */

  public async updateOperationalState(state: number): Promise<void> {
    this.currentOperationalState = state // Track the current state
    await this.updateState('rvcOperationalState', { operationalState: state })
    const states = [
      'Stopped',
      'Running',
      'Paused',
      'Error',
      null,
      null,
      null,
      null,
      ...Array.from({ length: 56 }).fill(null),
      'Seeking Charger',
      'Charging',
      'Docked',
      'Emptying Dust Bin',
      'Cleaning Mop',
      'Filling Water Tank',
      'Updating Maps',
    ]
    this.logInfo(`operational state updated to: ${states[state] || `Unknown (${state})`}`)
  }

  public async updateRunMode(mode: number): Promise<void> {
    await this.updateState('rvcRunMode', { currentMode: mode })
    const modes = ['Idle', 'Cleaning', 'Mapping']
    this.logInfo(`run mode updated to: ${modes[mode] || `Unknown (${mode})`}`)
  }

  public async updateCleanMode(mode: number): Promise<void> {
    await this.updateState('rvcCleanMode', { currentMode: mode })
    const modes = [
      'Vacuum',
      'Mop',
      'Vacuum & Mop',
      'Deep Clean',
      'Deep Vacuum',
      'Deep Mop',
      'Quick Clean',
      'Max Clean',
      'Min Clean',
      'Quiet Vacuum',
      'Quiet Mop',
      'Night Mode',
      'Eco Vacuum',
      'Eco Mop',
      'Auto',
    ]
    this.logInfo(`clean mode updated to: ${modes[mode] || `Unknown (${mode})`}`)
  }

  public async updateSelectedAreas(areaIds: number[]): Promise<void> {
    await this.updateState('serviceArea', { selectedAreas: areaIds })
    const areaNames = areaIds.map(id =>
      ['Living Room', 'Kitchen', 'Bedroom', 'Bathroom'][id] || `Area ${id}`,
    )
    this.logInfo(`selected areas updated to: ${areaNames.join(', ') || 'All Areas'}`)
  }

  public async updateCurrentArea(areaId: number | null): Promise<void> {
    await this.updateState('serviceArea', { currentArea: areaId })
    if (areaId !== null) {
      const areaName = ['Living Room', 'Kitchen', 'Bedroom', 'Bathroom'][areaId] || `Area ${areaId}`
      this.logInfo(`current area updated to: ${areaName}`)
    } else {
      this.logInfo('current area cleared')
    }
  }

  public async updateProgress(progress: Array<{ areaId: number, status: number }>): Promise<void> {
    await this.updateState('serviceArea', { progress })
    this.logInfo(`progress updated: ${progress.length} areas`)
  }

  /**
   * Update battery percentage
   * @param percentage - Battery percentage (0-100)
   */
  public async updateBatteryPercentage(percentage: number): Promise<void> {
    // Convert percentage to Matter format (0-200, where 200 = 100%)
    const batPercentRemaining = Math.max(0, Math.min(200, Math.round(percentage * 2)))

    // Determine charge level based on percentage
    let batChargeLevel = 0 // Ok
    if (percentage < 20) {
      batChargeLevel = 2 // Critical
    } else if (percentage < 40) {
      batChargeLevel = 1 // Warning
    }

    await this.updateState('powerSource', { batPercentRemaining, batChargeLevel })
    this.logInfo(`battery updated to: ${percentage}% (${batChargeLevel === 0 ? 'Ok' : batChargeLevel === 1 ? 'Warning' : 'Critical'})`)
  }

  /**
   * Convenience Methods for Maintenance States
   * These helper methods make it easier to transition to maintenance states
   */

  /**
   * Set the vacuum to emptying dust bin state (e.g., on a dock)
   */
  public async setEmptyingDustBin(): Promise<void> {
    await this.updateOperationalState(67)
  }

  /**
   * Set the vacuum to cleaning mop state (e.g., on a dock)
   */
  public async setCleaningMop(): Promise<void> {
    await this.updateOperationalState(68)
  }

  /**
   * Set the vacuum to filling water tank state (e.g., from a dock)
   */
  public async setFillingWaterTank(): Promise<void> {
    await this.updateOperationalState(69)
  }

  /**
   * Set the vacuum to updating maps state
   */
  public async setUpdatingMaps(): Promise<void> {
    await this.updateOperationalState(70)
  }

  /**
   * Schedule a cleaning operation with automatic completion
   * Reduces code duplication across start/resume handlers
   *
   * @param durationSeconds - How long the cleaning should run before completing
   */
  private scheduleCleaningCompletion(durationSeconds: number): void {
    const completionTimer = setTimeout(async () => {
      this.logInfo('cleaning completed, returning to dock.')
      await this.updateRunMode(0) // Set to Idle - cleaning session ending

      this.returnToDock()
    }, durationSeconds * 1000)

    this.activeTimers.push(completionTimer)
  }
}
