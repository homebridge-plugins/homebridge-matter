/* global NodeJS */

/**
 * Robotic Vacuum Cleaner Device (Matter Spec § 12.1)
 *
 * A robotic vacuum cleaner with autonomous cleaning capabilities.
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - Complex multi-cluster device (RvcRunMode, RvcOperationalState, RvcCleanMode, ServiceArea)
 * - External accessory publishing (required for Apple Home RVC devices)
 * - Using api.matter.types for mode tags and operational states
 * - Zone/room-based cleaning (Matter 1.4+ ServiceArea cluster)
 * - Realistic state transitions with timer-based automation
 *
 * IMPORTANT: This device is published using api.matter.publishExternalAccessories() in
 * platform.ts because RVC devices require dedicated Matter bridges for Apple Home compatibility.
 */

import type { DeviceContext } from '../types.js'

/**
 * Timer management for realistic vacuum behavior
 * Stores active timers so they can be cleared when state changes
 */
const activeTimers = new Map<string, NodeJS.Timeout[]>()

/**
 * Clear all active timers for a vacuum
 */
function clearVacuumTimers(uuid: string): void {
  const timers = activeTimers.get(uuid)
  if (timers) {
    timers.forEach(timer => clearTimeout(timer))
    activeTimers.delete(uuid)
  }
}

/**
 * Store a timer for a vacuum
 */
function addVacuumTimer(uuid: string, timer: NodeJS.Timeout): void {
  if (!activeTimers.has(uuid)) {
    activeTimers.set(uuid, [])
  }
  activeTimers.get(uuid)!.push(timer)
}

export function registerRoboticVacuumCleaner(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  if (!config.enableRobotVacuum) {
    return accessories
  }

  const uuid = api.matter.uuid.generate('matter-robot-vacuum')

  accessories.push({
    uuid,
    displayName: 'Robot Vacuum',
    deviceType: api.matter.deviceTypes.RoboticVacuumCleaner,
    serialNumber: 'VACUUM-001',
    manufacturer: 'Matter Examples',
    model: 'RobotVacuum v1',

    clusters: {
      // RVC Run Mode Cluster - Defines operational modes (Idle, Cleaning, Mapping, etc.)
      rvcRunMode: {
        supportedModes: [
          {
            label: 'Idle',
            mode: 0,
            modeTags: [
              { value: api.matter.types.RvcRunMode.ModeTag.Idle },
            ],
          },
          {
            label: 'Quick-Cleaning',
            mode: 1,
            modeTags: [
              { value: api.matter.types.RvcRunMode.ModeTag.Cleaning },
              { value: api.matter.types.ModeBase.ModeTag.Quick },
            ],
          },
          {
            label: 'Auto-Cleaning',
            mode: 2,
            modeTags: [
              { value: api.matter.types.RvcRunMode.ModeTag.Cleaning },
              { value: api.matter.types.ModeBase.ModeTag.Auto },
            ],
          },
          {
            label: 'Mapping',
            mode: 3,
            modeTags: [
              { value: api.matter.types.RvcRunMode.ModeTag.Mapping },
            ],
          },
        ],
        currentMode: 0, // Idle
      },

      // RVC Operational State Cluster - Tracks current activity (Stopped, Running, Paused, etc.)
      rvcOperationalState: {
        operationalStateList: [
          {
            operationalStateId: api.matter.types.RvcOperationalState.OperationalState.Stopped,
            operationalStateLabel: 'Stopped',
          },
          {
            operationalStateId: api.matter.types.RvcOperationalState.OperationalState.Running,
            operationalStateLabel: 'Running',
          },
          {
            operationalStateId: api.matter.types.RvcOperationalState.OperationalState.Paused,
            operationalStateLabel: 'Paused',
          },
          {
            operationalStateId: api.matter.types.RvcOperationalState.OperationalState.Error,
            operationalStateLabel: 'Error',
          },
          {
            operationalStateId: api.matter.types.RvcOperationalState.OperationalState.SeekingCharger,
            operationalStateLabel: 'Seeking Charger',
          },
          {
            operationalStateId: api.matter.types.RvcOperationalState.OperationalState.Charging,
            operationalStateLabel: 'Charging',
          },
          {
            operationalStateId: api.matter.types.RvcOperationalState.OperationalState.Docked,
            operationalStateLabel: 'Docked',
          },
        ],
        operationalState: api.matter.types.RvcOperationalState.OperationalState.Docked,
        operationalError: {
          errorStateId: api.matter.types.OperationalState.ErrorState.NoError,
          errorStateLabel: '',
        },
      },

      // RVC Clean Mode Cluster - Defines cleaning method (Vacuum, Mop, etc.)
      rvcCleanMode: {
        supportedModes: [
          {
            label: 'Vacuum',
            mode: 0,
            modeTags: [
              { value: api.matter.types.RvcCleanMode.ModeTag.Vacuum },
            ],
          },
          {
            label: 'Mop',
            mode: 1,
            modeTags: [
              { value: api.matter.types.RvcCleanMode.ModeTag.Mop },
            ],
          },
          {
            label: 'Vacuum & Mop',
            mode: 2,
            modeTags: [
              { value: api.matter.types.RvcCleanMode.ModeTag.Vacuum },
              { value: api.matter.types.RvcCleanMode.ModeTag.Mop },
            ],
          },
        ],
        currentMode: 0, // Vacuum
      },

      // Service Area Cluster (Matter 1.4+) - Zone/Room-based cleaning
      serviceArea: {
        supportedMaps: [
          {
            mapId: 0,
            name: 'Main Floor',
          },
        ],
        supportedAreas: [
          {
            areaId: 0, // Unique ID for this area
            mapId: 0, // References the map defined in supportedMaps
            areaInfo: {
              locationInfo: {
                locationName: 'Kitchen',
                floorNumber: 0, // Ground floor
                areaType: 7, // Kitchen area type tag
              },
              landmarkInfo: null, // Optional: nearby landmarks
            },
          },
          {
            areaId: 1,
            mapId: 0, // References the map defined in supportedMaps
            areaInfo: {
              locationInfo: {
                locationName: 'Living Room',
                floorNumber: 0,
                areaType: 3, // Living room area type tag
              },
              landmarkInfo: null,
            },
          },
          {
            areaId: 2,
            mapId: 0, // References the map defined in supportedMaps
            areaInfo: {
              locationInfo: {
                locationName: 'Bedroom',
                floorNumber: 0,
                areaType: 2, // Bedroom area type tag
              },
              landmarkInfo: null,
            },
          },
          {
            areaId: 3,
            mapId: 0, // References the map defined in supportedMaps
            areaInfo: {
              locationInfo: {
                locationName: 'Bathroom',
                floorNumber: 0,
                areaType: 6, // Bathroom area type tag
              },
              landmarkInfo: null,
            },
          },
        ],

        // Areas selected for the next/current cleaning session
        // Empty array = clean all areas
        selectedAreas: [],

        // Current area being cleaned (null when not cleaning)
        currentArea: null,

        // Progress information (optional but useful)
        progress: [],
      },
    },

    // Handlers respond to commands from Home apps (Apple Home, Google Home, etc.)
    // These are called when users interact with the device in their Home app
    handlers: {
      // ══════════════════════════════════════════════════════════════════════════
      // RVC Operational State handlers - control device operation
      // ══════════════════════════════════════════════════════════════════════════
      rvcOperationalState: {
        /**
         * pause() - Called when user presses "pause" in Home app
         *
         * REALISTIC BEHAVIOR:
         * - Immediately pauses the vacuum
         * - Cancels any active cleaning or docking sequences
         * - Stays paused until user resumes or sends home
         */
        pause: async () => {
          log.info('[Robot Vacuum] ✓ Handler `pause` called - Pausing cleaning')

          try {
            // Clear any active automated sequences (cleaning, docking, etc.)
            clearVacuumTimers(uuid)
            log.info('[Robot Vacuum] Cleared active timers')

            // TODO: Send pause command to your actual robot vacuum
            // Example: await yourVacuumAPI.pause()

            // Update Matter state to Paused
            api.matter.updateAccessoryState(
              uuid,
              api.matter.clusterNames.RvcOperationalState,
              { operationalState: api.matter.types.RvcOperationalState.OperationalState.Paused },
            )
          } catch (error) {
            log.error('[Robot Vacuum] Failed to pause:', error)
            api.matter.updateAccessoryState(
              uuid,
              api.matter.clusterNames.RvcOperationalState,
              {
                operationalState: api.matter.types.RvcOperationalState.OperationalState.Error,
                operationalError: {
                  errorStateId: 1,
                  errorStateLabel: 'Failed to pause vacuum',
                },
              },
            )
          }
        },

        /**
         * resume() - Called when user presses "resume" or "start" in Home app
         *
         * REALISTIC BEHAVIOR:
         * 1. Immediately starts cleaning (Running state)
         * 2. After 10 seconds: Cleaning complete, automatically returns to dock (SeekingCharger)
         * 3. After 10 more seconds: Reaches dock and starts charging (Charging)
         * 4. After 10 more seconds: Fully charged and ready (Docked)
         *
         * This simulates a complete cleaning cycle without needing an external app.
         */
        resume: async () => {
          log.info('[Robot Vacuum] ✓ Handler `resume` called - Starting cleaning cycle')

          try {
            // Clear any previous timers to avoid conflicts
            clearVacuumTimers(uuid)

            // TODO: Send start/resume command to your actual robot vacuum
            // Example: await yourVacuumAPI.resume()

            // Step 1: Start cleaning immediately
            api.matter.updateAccessoryState(
              uuid,
              api.matter.clusterNames.RvcOperationalState,
              { operationalState: api.matter.types.RvcOperationalState.OperationalState.Running },
            )
            log.info('[Robot Vacuum] State: Running (cleaning started)')

            // Step 2: After 10 seconds, finish cleaning and head home
            const timer1 = setTimeout(() => {
              log.info('[Robot Vacuum] Cleaning complete after 10 seconds, returning to dock')
              api.matter.updateAccessoryState(
                uuid,
                api.matter.clusterNames.RvcOperationalState,
                { operationalState: api.matter.types.RvcOperationalState.OperationalState.SeekingCharger },
              )
              log.info('[Robot Vacuum] State: SeekingCharger (heading to dock)')

              // Clear current area since we're done cleaning
              api.matter.updateAccessoryState(uuid, 'serviceArea', {
                currentArea: null,
              })

              // Step 3: After 10 more seconds, reach dock and start charging
              const timer2 = setTimeout(() => {
                log.info('[Robot Vacuum] Reached dock after 10 seconds, starting charge')
                api.matter.updateAccessoryState(
                  uuid,
                  api.matter.clusterNames.RvcOperationalState,
                  { operationalState: api.matter.types.RvcOperationalState.OperationalState.Charging },
                )
                log.info('[Robot Vacuum] State: Charging (on dock, charging battery)')

                // Step 4: After 10 more seconds, fully charged and ready
                const timer3 = setTimeout(() => {
                  log.info('[Robot Vacuum] Fully charged after 10 seconds, ready for next cycle')
                  api.matter.updateAccessoryState(
                    uuid,
                    api.matter.clusterNames.RvcOperationalState,
                    { operationalState: api.matter.types.RvcOperationalState.OperationalState.Docked },
                  )
                  log.info('[Robot Vacuum] State: Docked (ready and fully charged)')
                }, 10000)

                addVacuumTimer(uuid, timer3)
              }, 10000)

              addVacuumTimer(uuid, timer2)
            }, 10000)

            addVacuumTimer(uuid, timer1)
          } catch (error) {
            log.error('[Robot Vacuum] Failed to resume:', error)
            clearVacuumTimers(uuid)
            api.matter.updateAccessoryState(
              uuid,
              api.matter.clusterNames.RvcOperationalState,
              {
                operationalState: api.matter.types.RvcOperationalState.OperationalState.Error,
                operationalError: {
                  errorStateId: 1,
                  errorStateLabel: 'Failed to resume vacuum',
                },
              },
            )
          }
        },

        /**
         * goHome() - Called when user sends robot to charging dock
         *
         * REALISTIC BEHAVIOR:
         * 1. Immediately cancels cleaning and heads to dock (SeekingCharger)
         * 2. After 10 seconds: Reaches dock and starts charging (Charging)
         * 3. After 10 more seconds: Fully charged and ready (Docked)
         *
         * This simulates the robot navigating back to its dock and charging.
         */
        goHome: async () => {
          log.info('[Robot Vacuum] ✓ Handler `goHome` called - Returning to dock')

          try {
            // Clear any active cleaning timers
            clearVacuumTimers(uuid)

            // TODO: Send return-to-dock command to your actual robot vacuum
            // Example: await yourVacuumAPI.returnToDock()

            // Clear current area when returning home
            api.matter.updateAccessoryState(uuid, 'serviceArea', {
              currentArea: null,
            })

            // Step 1: Start heading to dock immediately
            api.matter.updateAccessoryState(
              uuid,
              api.matter.clusterNames.RvcOperationalState,
              { operationalState: api.matter.types.RvcOperationalState.OperationalState.SeekingCharger },
            )
            log.info('[Robot Vacuum] State: SeekingCharger (navigating to dock)')

            // Step 2: After 10 seconds, reach dock and start charging
            const timer1 = setTimeout(() => {
              log.info('[Robot Vacuum] Reached dock after 10 seconds, starting charge')
              api.matter.updateAccessoryState(
                uuid,
                api.matter.clusterNames.RvcOperationalState,
                { operationalState: api.matter.types.RvcOperationalState.OperationalState.Charging },
              )
              log.info('[Robot Vacuum] State: Charging (on dock, charging battery)')

              // Step 3: After 10 more seconds, fully charged and ready
              const timer2 = setTimeout(() => {
                log.info('[Robot Vacuum] Fully charged after 10 seconds, ready for next cycle')
                api.matter.updateAccessoryState(
                  uuid,
                  api.matter.clusterNames.RvcOperationalState,
                  { operationalState: api.matter.types.RvcOperationalState.OperationalState.Docked },
                )
                log.info('[Robot Vacuum] State: Docked (ready and fully charged)')
              }, 10000)

              addVacuumTimer(uuid, timer2)
            }, 10000)

            addVacuumTimer(uuid, timer1)
          } catch (error) {
            log.error('[Robot Vacuum] Failed to return home:', error)
            clearVacuumTimers(uuid)
            api.matter.updateAccessoryState(
              uuid,
              api.matter.clusterNames.RvcOperationalState,
              {
                operationalState: api.matter.types.RvcOperationalState.OperationalState.Error,
                operationalError: {
                  errorStateId: 1,
                  errorStateLabel: 'Failed to return to dock',
                },
              },
            )
          }
        },
      },

      // ══════════════════════════════════════════════════════════════════════════
      // RVC Run Mode handlers - change operational modes
      // ══════════════════════════════════════════════════════════════════════════
      rvcRunMode: {
        /**
         * changeToMode() - Called when user changes the run mode
         *
         * Run Modes:
         * 0 = Idle - Device is inactive
         * 1 = Quick-Cleaning - Single cleaning cycle (5 seconds)
         * 2 = Auto-Cleaning - Full cleaning cycle (10 seconds)
         * 3 = Mapping - Map the environment (10 seconds, then stop)
         *
         * REALISTIC BEHAVIOR:
         * - Changing to Idle: Stops immediately (Stopped state)
         * - Changing to Quick-Cleaning: Cleans for 5 seconds, then docks
         * - Changing to Auto-Cleaning: Cleans for 10 seconds, then docks
         * - Changing to Mapping: Maps for 10 seconds, then returns to Stopped
         */
        changeToMode: async (request: { newMode: number }) => {
          const modes = ['Idle', 'Quick-Cleaning', 'Auto-Cleaning', 'Mapping']
          const modeName = modes[request.newMode] || `Unknown (${request.newMode})`
          log.info(`[Robot Vacuum] ✓ Handler \`changeToMode\` (run mode) called: ${request.newMode} (${modeName})`)

          try {
            // Clear any active timers
            clearVacuumTimers(uuid)

            // Update run mode
            api.matter.updateAccessoryState(
              uuid,
              api.matter.clusterNames.RvcRunMode,
              { currentMode: request.newMode },
            )

            // Handle different modes with realistic behavior
            if (request.newMode === 0) {
              // Mode 0: Idle - Stop immediately
              log.info('[Robot Vacuum] Switching to Idle mode - stopping')
              api.matter.updateAccessoryState(
                uuid,
                api.matter.clusterNames.RvcOperationalState,
                { operationalState: api.matter.types.RvcOperationalState.OperationalState.Stopped },
              )
            } else if (request.newMode === 1) {
              // Mode 1: Quick-Cleaning - Clean for 5 seconds, then dock
              log.info('[Robot Vacuum] Starting Quick-Cleaning mode (5 seconds)')
              api.matter.updateAccessoryState(
                uuid,
                api.matter.clusterNames.RvcOperationalState,
                { operationalState: api.matter.types.RvcOperationalState.OperationalState.Running },
              )

              // After 5 seconds, return to dock
              const timer1 = setTimeout(() => {
                log.info('[Robot Vacuum] Quick-Cleaning complete, returning to dock')
                api.matter.updateAccessoryState(
                  uuid,
                  api.matter.clusterNames.RvcOperationalState,
                  { operationalState: api.matter.types.RvcOperationalState.OperationalState.SeekingCharger },
                )

                // 10 seconds to dock and charge (same as before)
                const timer2 = setTimeout(() => {
                  api.matter.updateAccessoryState(
                    uuid,
                    api.matter.clusterNames.RvcOperationalState,
                    { operationalState: api.matter.types.RvcOperationalState.OperationalState.Charging },
                  )

                  const timer3 = setTimeout(() => {
                    api.matter.updateAccessoryState(
                      uuid,
                      api.matter.clusterNames.RvcOperationalState,
                      { operationalState: api.matter.types.RvcOperationalState.OperationalState.Docked },
                    )
                  }, 10000)
                  addVacuumTimer(uuid, timer3)
                }, 10000)
                addVacuumTimer(uuid, timer2)
              }, 5000)
              addVacuumTimer(uuid, timer1)
            } else if (request.newMode === 2) {
              // Mode 2: Auto-Cleaning - Clean for 10 seconds, then dock
              log.info('[Robot Vacuum] Starting Auto-Cleaning mode (10 seconds)')
              api.matter.updateAccessoryState(
                uuid,
                api.matter.clusterNames.RvcOperationalState,
                { operationalState: api.matter.types.RvcOperationalState.OperationalState.Running },
              )

              // After 10 seconds, return to dock (same logic as resume)
              const timer1 = setTimeout(() => {
                log.info('[Robot Vacuum] Auto-Cleaning complete, returning to dock')
                api.matter.updateAccessoryState(
                  uuid,
                  api.matter.clusterNames.RvcOperationalState,
                  { operationalState: api.matter.types.RvcOperationalState.OperationalState.SeekingCharger },
                )

                const timer2 = setTimeout(() => {
                  api.matter.updateAccessoryState(
                    uuid,
                    api.matter.clusterNames.RvcOperationalState,
                    { operationalState: api.matter.types.RvcOperationalState.OperationalState.Charging },
                  )

                  const timer3 = setTimeout(() => {
                    api.matter.updateAccessoryState(
                      uuid,
                      api.matter.clusterNames.RvcOperationalState,
                      { operationalState: api.matter.types.RvcOperationalState.OperationalState.Docked },
                    )
                  }, 10000)
                  addVacuumTimer(uuid, timer3)
                }, 10000)
                addVacuumTimer(uuid, timer2)
              }, 10000)
              addVacuumTimer(uuid, timer1)
            } else if (request.newMode === 3) {
              // Mode 3: Mapping - Map for 10 seconds, then stop (no docking)
              log.info('[Robot Vacuum] Starting Mapping mode (10 seconds)')
              api.matter.updateAccessoryState(
                uuid,
                api.matter.clusterNames.RvcOperationalState,
                { operationalState: api.matter.types.RvcOperationalState.OperationalState.Running },
              )

              // After 10 seconds, stop mapping
              const timer1 = setTimeout(() => {
                log.info('[Robot Vacuum] Mapping complete, stopping')
                api.matter.updateAccessoryState(
                  uuid,
                  api.matter.clusterNames.RvcOperationalState,
                  { operationalState: api.matter.types.RvcOperationalState.OperationalState.Stopped },
                )
              }, 10000)
              addVacuumTimer(uuid, timer1)
            }
          } catch (error) {
            log.error('[Robot Vacuum] Failed to change run mode:', error)
            clearVacuumTimers(uuid)
            api.matter.updateAccessoryState(
              uuid,
              api.matter.clusterNames.RvcOperationalState,
              {
                operationalState: api.matter.types.RvcOperationalState.OperationalState.Error,
                operationalError: {
                  errorStateId: 1,
                  errorStateLabel: `Failed to change to ${modeName} mode`,
                },
              },
            )
          }
        },
      },

      // ══════════════════════════════════════════════════════════════════════════
      // RVC Clean Mode handlers - change cleaning method
      // ══════════════════════════════════════════════════════════════════════════
      rvcCleanMode: {
        /**
         * changeToMode() - Called when user changes the clean mode
         *
         * Clean Modes:
         * 0 = Vacuum - Dry vacuuming only
         * 1 = Mop - Wet mopping only
         * 2 = Vacuum & Mop - Combined vacuum and mop
         *
         * You can add additional modes like Quiet, Turbo, Deep Clean, etc.
         */
        changeToMode: async (request: { newMode: number }) => {
          const modes = ['Vacuum', 'Mop', 'Vacuum & Mop']
          const modeName = modes[request.newMode] || `Unknown (${request.newMode})`
          log.info(`[Robot Vacuum] ✓ Handler \`changeToMode\` (clean mode) called: ${request.newMode} (${modeName})`)

          try {
            // TODO: Send clean mode change to your actual robot vacuum
            // Example:
            // if (request.newMode === 0) {
            //   await yourVacuumAPI.setCleanMode('vacuum')
            // } else if (request.newMode === 1) {
            //   await yourVacuumAPI.setCleanMode('mop')
            // } else if (request.newMode === 2) {
            //   await yourVacuumAPI.setCleanMode('vacuum_and_mop')
            // }

            // Update Matter state
            return api.matter.updateAccessoryState(
              uuid,
              api.matter.clusterNames.RvcCleanMode,
              { currentMode: request.newMode },
            )
          } catch (error) {
            log.error('[Robot Vacuum] Failed to change clean mode:', error)
            return api.matter.updateAccessoryState(
              uuid,
              api.matter.clusterNames.RvcOperationalState,
              {
                operationalState: api.matter.types.RvcOperationalState.OperationalState.Error,
                operationalError: {
                  errorStateId: 1,
                  errorStateLabel: `Failed to change to ${modeName} mode`,
                },
              },
            )
          }
        },
      },

      // ══════════════════════════════════════════════════════════════════════════
      // Service Area handlers (Matter 1.4+) - Zone/room selection
      // ══════════════════════════════════════════════════════════════════════════
      //
      // These handlers manage which rooms/zones the vacuum should clean.
      // Controllers like iOS 18.4+ will use these to allow room-specific cleaning.
      serviceArea: {
        /**
         * selectAreas() - Called when user selects specific rooms to clean
         *
         * @param request - Request object
         * @param request.newAreas - Array of area IDs to clean (Matter spec uses "newAreas")
         *
         * REALISTIC BEHAVIOR:
         * - Stores the selected areas
         * - Automatically starts cleaning those areas sequentially
         * - Each area takes 5 seconds to clean
         * - Updates currentArea to show which room is being cleaned
         * - After all areas cleaned, returns to dock
         *
         * Example: User selects Kitchen (0) and Living Room (1)
         * 1. Clean Kitchen for 5 seconds
         * 2. Clean Living Room for 5 seconds
         * 3. Return to dock
         */
        selectAreas: async (request: { newAreas: number[] }) => {
          const areaNames = ['Kitchen', 'Living Room', 'Bedroom', 'Bathroom']
          const areas = request.newAreas || []
          const selectedNames = areas.map(id => areaNames[id] || `Area ${id}`)
          log.info(`[Robot Vacuum] ✓ Handler \`selectAreas\` called - Selected areas: ${selectedNames.join(', ') || 'All areas'}`)

          try {
            // Clear any active timers
            clearVacuumTimers(uuid)

            // Update selected areas
            api.matter.updateAccessoryState(
              uuid,
              'serviceArea',
              { selectedAreas: areas },
            )

            // If no areas selected, just store and return
            if (areas.length === 0) {
              log.info('[Robot Vacuum] No specific areas selected, ready to clean all areas')
              return
            }

            // Start cleaning the selected areas sequentially
            log.info(`[Robot Vacuum] Starting area-based cleaning: ${selectedNames.join(' → ')}`)

            // Start running
            api.matter.updateAccessoryState(
              uuid,
              api.matter.clusterNames.RvcOperationalState,
              { operationalState: api.matter.types.RvcOperationalState.OperationalState.Running },
            )

            // Clean each area sequentially (5 seconds per area)
            let delay = 0
            for (let i = 0; i < areas.length; i++) {
              const areaId = areas[i]
              const areaName = areaNames[areaId] || `Area ${areaId}`

              const timer = setTimeout(() => {
                log.info(`[Robot Vacuum] Now cleaning: ${areaName} (${i + 1}/${areas.length})`)
                api.matter.updateAccessoryState(uuid, 'serviceArea', {
                  currentArea: areaId,
                })
              }, delay)
              addVacuumTimer(uuid, timer)

              delay += 5000 // 5 seconds per area
            }

            // After all areas are cleaned, return to dock
            const finalTimer = setTimeout(() => {
              log.info('[Robot Vacuum] All areas cleaned, returning to dock')
              api.matter.updateAccessoryState(uuid, 'serviceArea', {
                currentArea: null,
              })
              api.matter.updateAccessoryState(
                uuid,
                api.matter.clusterNames.RvcOperationalState,
                { operationalState: api.matter.types.RvcOperationalState.OperationalState.SeekingCharger },
              )

              // 10 seconds to reach dock
              const dockTimer1 = setTimeout(() => {
                api.matter.updateAccessoryState(
                  uuid,
                  api.matter.clusterNames.RvcOperationalState,
                  { operationalState: api.matter.types.RvcOperationalState.OperationalState.Charging },
                )

                // 10 seconds to charge
                const dockTimer2 = setTimeout(() => {
                  api.matter.updateAccessoryState(
                    uuid,
                    api.matter.clusterNames.RvcOperationalState,
                    { operationalState: api.matter.types.RvcOperationalState.OperationalState.Docked },
                  )
                  log.info('[Robot Vacuum] Area-based cleaning complete, docked and charged')
                }, 10000)
                addVacuumTimer(uuid, dockTimer2)
              }, 10000)
              addVacuumTimer(uuid, dockTimer1)
            }, delay)
            addVacuumTimer(uuid, finalTimer)
          } catch (error) {
            log.error('[Robot Vacuum] Failed to select areas:', error)
            clearVacuumTimers(uuid)
            api.matter.updateAccessoryState(
              uuid,
              api.matter.clusterNames.RvcOperationalState,
              {
                operationalState: api.matter.types.RvcOperationalState.OperationalState.Error,
                operationalError: {
                  errorStateId: 1,
                  errorStateLabel: 'Failed to select cleaning areas',
                },
              },
            )
          }
        },

        /**
         * skipCurrentArea() - Called when user wants to skip the current room
         *
         * This is useful if the vacuum gets stuck or if the user wants to
         * skip a room during a multi-room cleaning session.
         */
        skipCurrentArea: async () => {
          log.info('[Robot Vacuum] ✓ Handler `skipCurrentArea` called - Skipping current room')

          try {
            // TODO: Send skip command to your actual robot vacuum
            // Example: await yourVacuumAPI.skipCurrentArea()

            // Move to next area (you'll need to track area progression)
            // For this example, we just clear the current area
            return api.matter.updateAccessoryState(
              uuid,
              'serviceArea',
              { currentArea: null },
            )
          } catch (error) {
            log.error('[Robot Vacuum] Failed to skip area:', error)
            return api.matter.updateAccessoryState(
              uuid,
              api.matter.clusterNames.RvcOperationalState,
              {
                operationalState: api.matter.types.RvcOperationalState.OperationalState.Error,
                operationalError: {
                  errorStateId: 1,
                  errorStateLabel: 'Failed to skip current area',
                },
              },
            )
          }
        },
      },
    },
  })

  // Log helpful information
  log.info('[Robot Vacuum] Configuration created')
  log.info('[Robot Vacuum] This device will be published on its own external bridge')
  log.info('[Robot Vacuum] Look for separate commissioning codes in the logs when Homebridge starts')

  return accessories
}

// ════════════════════════════════════════════════════════════════════════════
// DEVELOPER GUIDE: Implementing a Real Robot Vacuum Integration
// ════════════════════════════════════════════════════════════════════════════
//
// This example provides a comprehensive template for integrating a real robot
// vacuum cleaner with Matter through Homebridge. The implementation includes
// all standard RVC clusters plus the optional Service Area cluster (Matter 1.4+).
//
// ────────────────────────────────────────────────────────────────────────────
// 1. INITIAL SETUP & CONFIGURATION
// ────────────────────────────────────────────────────────────────────────────
//
// Store your vacuum API client in the platform class for easy access:
//
// ```typescript
// export class MatterPlatform {
//   private vacuumClients: Map<string, VacuumAPI> = new Map()
//
//   async configureMatterAccessory(accessory: any) {
//     if (accessory.context?.vacuumDeviceId) {
//       // Reconnect to vacuum using stored device ID
//       const client = new VacuumAPI()
//       await client.connect(accessory.context.vacuumDeviceId)
//       this.vacuumClients.set(accessory.uuid, client)
//
//       // Set up state monitoring
//       this.monitorVacuumState(accessory.uuid, client)
//     }
//   }
// }
// ```
//
// ────────────────────────────────────────────────────────────────────────────
// 2. STATE UPDATES FROM PHYSICAL DEVICE (Device → Matter)
// ────────────────────────────────────────────────────────────────────────────
//
// When the vacuum state changes externally (button press, manufacturer app,
// schedule, etc.), you MUST update the Matter state to keep controllers in sync.
//
// Example: Event-based updates (recommended if available)
// ```typescript
// monitorVacuumState(uuid: string, vacuumAPI: VacuumAPI) {
//   // Listen for state changes from the vacuum
//   vacuumAPI.on('stateChanged', async (newState) => {
//     // Update operational state
//     await api.matter.updateAccessoryState(uuid, 'rvcOperationalState', {
//       operationalState: this.convertToMatterOperationalState(newState.status)
//     })
//
//     // Update run mode if changed
//     if (newState.mode) {
//       await api.matter.updateAccessoryState(uuid, 'rvcRunMode', {
//         currentMode: this.convertToMatterRunMode(newState.mode)
//       })
//     }
//
//     // Update current cleaning area if available
//     if (newState.currentRoom) {
//       await api.matter.updateAccessoryState(uuid, 'serviceArea', {
//         currentArea: newState.currentRoom
//       })
//     }
//
//     // Update battery level (if you have a powerSource cluster)
//     if (newState.battery) {
//       await api.matter.updateAccessoryState(uuid, 'powerSource', {
//         batPercentRemaining: newState.battery * 2, // 0-200 scale
//         batChargeLevel: newState.battery > 20 ? 2 : (newState.battery > 5 ? 1 : 0)
//       })
//     }
//   })
//
//   // Listen for errors
//   vacuumAPI.on('error', async (error) => {
//     await api.matter.updateAccessoryState(uuid, 'rvcOperationalState', {
//       operationalState: 3, // Error state
//       operationalError: {
//         errorStateId: this.mapErrorToMatter(error.code),
//         errorStateLabel: error.message
//       }
//     })
//   })
// }
//
// // Helper functions to convert vacuum states to Matter states
// convertToMatterOperationalState(status: string): number {
//   const stateMap = {
//     'idle': api.matter.types.RvcOperationalState.OperationalState.Stopped,
//     'cleaning': api.matter.types.RvcOperationalState.OperationalState.Running,
//     'paused': api.matter.types.RvcOperationalState.OperationalState.Paused,
//     'error': api.matter.types.RvcOperationalState.OperationalState.Error,
//     'returning': api.matter.types.RvcOperationalState.OperationalState.SeekingCharger,
//     'charging': api.matter.types.RvcOperationalState.OperationalState.Charging,
//     'docked': api.matter.types.RvcOperationalState.OperationalState.Docked
//   }
//   return stateMap[status] ?? api.matter.types.RvcOperationalState.OperationalState.Stopped
// }
// ```
//
// Example: Polling-based updates (if events not available)
// ```typescript
// startPolling(uuid: string, vacuumAPI: VacuumAPI) {
//   setInterval(async () => {
//     try {
//       const state = await vacuumAPI.getState()
//
//       // Only update if state changed (to avoid unnecessary updates)
//       const currentState = api.matter.getAccessoryState(uuid, 'rvcOperationalState')
//       if (currentState.operationalState !== state.operationalState) {
//         await api.matter.updateAccessoryState(uuid, 'rvcOperationalState', {
//           operationalState: this.convertToMatterOperationalState(state.status)
//         })
//       }
//     } catch (error) {
//       log.error('Error polling vacuum state:', error)
//     }
//   }, 5000) // Poll every 5 seconds
// }
// ```
//
// ────────────────────────────────────────────────────────────────────────────
// 3. COMMAND HANDLING (Matter → Device)
// ────────────────────────────────────────────────────────────────────────────
//
// Commands come from Home apps via handlers. Send these to your physical device.
//
// Example: Operational state commands
// ```typescript
// handlers: {
//   rvcOperationalState: {
//     pause: async () => {
//       try {
//         await vacuumAPI.pause()
//         log.info('Successfully paused vacuum')
//
//         return api.matter.updateAccessoryState(uuid, 'rvcOperationalState', {
//           operationalState: api.matter.types.RvcOperationalState.OperationalState.Paused
//         })
//       } catch (error) {
//         log.error('Failed to pause vacuum:', error)
//         return api.matter.updateAccessoryState(uuid, 'rvcOperationalState', {
//           operationalState: api.matter.types.RvcOperationalState.OperationalState.Error,
//           operationalError: {
//             errorStateId: 1,
//             errorStateLabel: 'Failed to pause'
//           }
//         })
//       }
//     }
//   }
// }
// ```
//
// ────────────────────────────────────────────────────────────────────────────
// 4. SERVICE AREA (ROOM) MANAGEMENT
// ────────────────────────────────────────────────────────────────────────────
//
// The Service Area cluster enables room-specific cleaning. Here's how to manage
// area progression during a cleaning session:
//
// Example: Track and update current area during cleaning
// ```typescript
// async startAreaBasedCleaning(uuid: string, selectedAreas: number[]) {
//   const areas = selectedAreas.length > 0 ? selectedAreas : [0, 1, 2, 3] // All areas
//
//   for (const areaId of areas) {
//     // Update current area before starting
//     await api.matter.updateAccessoryState(uuid, 'serviceArea', {
//       currentArea: areaId
//     })
//
//     log.info(`Starting cleaning in area ${areaId}`)
//
//     // Send command to vacuum to clean this area
//     await vacuumAPI.cleanArea(areaId)
//
//     // Wait for completion (you might use events instead)
//     await this.waitForAreaCompletion(uuid, areaId)
//   }
//
//   // All areas cleaned, clear current area
//   await api.matter.updateAccessoryState(uuid, 'serviceArea', {
//     currentArea: null
//   })
//
//   log.info('All areas cleaned')
// }
//
// // Update progress as vacuum cleans each area
// vacuumAPI.on('areaProgress', async (data) => {
//   await api.matter.updateAccessoryState(uuid, 'serviceArea', {
//     progress: [{
//       areaId: data.areaId,
//       status: data.percentComplete < 100 ? 1 : 2, // 1=In Progress, 2=Completed
//       totalOperationalTime: data.timeElapsed
//     }]
//   })
// })
// ```
//
// ────────────────────────────────────────────────────────────────────────────
// 5. STATE MACHINE PATTERN
// ────────────────────────────────────────────────────────────────────────────
//
// Implement a state machine to handle complex cleaning workflows:
//
// ```typescript
// class VacuumStateMachine {
//   private currentState: 'idle' | 'cleaning' | 'paused' | 'returning' | 'charging' = 'idle'
//   private cleaningRounds = 0
//   private selectedAreas: number[] = []
//
//   async handleModeChange(newMode: number) {
//     switch (newMode) {
//       case 0: // Idle
//         await this.transitionToIdle()
//         break
//       case 1: // Quick-Cleaning
//         this.cleaningRounds = 1
//         await this.startCleaning()
//         break
//       case 2: // Auto-Cleaning
//         this.cleaningRounds = 3
//         await this.startCleaning()
//         break
//       case 3: // Mapping
//         await this.startMapping()
//         break
//     }
//   }
//
//   private async startCleaning() {
//     this.currentState = 'cleaning'
//     await api.matter.updateAccessoryState(uuid, 'rvcOperationalState', {
//       operationalState: api.matter.types.RvcOperationalState.OperationalState.Running
//     })
//
//     // Start cleaning selected areas or all areas
//     await this.cleanAreas(this.selectedAreas)
//
//     // When done, return to dock
//     await this.returnToDock()
//   }
//
//   private async returnToDock() {
//     this.currentState = 'returning'
//     await api.matter.updateAccessoryState(uuid, 'rvcOperationalState', {
//       operationalState: api.matter.types.RvcOperationalState.OperationalState.SeekingCharger
//     })
//
//     await vacuumAPI.returnToDock()
//
//     // Wait for docking (via event or polling)
//     // Then update to Charging or Docked state
//   }
// }
// ```
//
// ────────────────────────────────────────────────────────────────────────────
// 6. BATTERY LEVEL REPORTING
// ────────────────────────────────────────────────────────────────────────────
//
// Add battery status reporting using the PowerSource cluster:
//
// ```typescript
// clusters: {
//   // ... RVC clusters ...
//
//   powerSource: {
//     status: 0, // 0=Active, 1=Standby, 2=Unavailable
//     order: 0, // Primary power source
//     description: 'Battery',
//     batChargeLevel: 2, // 0=Critical, 1=Warning, 2=Ok
//     batPercentRemaining: 100, // 0-200 (multiply battery % by 2)
//     batVoltage: 14400, // Battery voltage in millivolts (optional)
//   }
// }
//
// // Update battery status when it changes
// vacuumAPI.on('batteryChanged', async (batteryPercent) => {
//   await api.matter.updateAccessoryState(uuid, 'powerSource', {
//     batPercentRemaining: batteryPercent * 2, // Convert to 0-200 scale
//     batChargeLevel: batteryPercent > 20 ? 2 : (batteryPercent > 5 ? 1 : 0),
//     status: batteryPercent > 0 ? 0 : 2 // Active if has charge, unavailable if depleted
//   })
// })
// ```
//
// ────────────────────────────────────────────────────────────────────────────
// 7. ERROR HANDLING & VALIDATION
// ────────────────────────────────────────────────────────────────────────────
//
// Always validate state transitions and handle errors gracefully:
//
// ```typescript
// // Validate state transitions
// function canPause(currentState: number): boolean {
//   // Can't pause if docked, charging, or seeking charger
//   return ![
//     api.matter.types.RvcOperationalState.OperationalState.SeekingCharger,
//     api.matter.types.RvcOperationalState.OperationalState.Charging,
//     api.matter.types.RvcOperationalState.OperationalState.Docked
//   ].includes(currentState)
// }
//
// // Map vacuum errors to Matter error codes
// function mapErrorToMatter(errorCode: string): number {
//   const errorMap = {
//     'STUCK': 1,
//     'WHEEL_ISSUE': 2,
//     'BRUSH_ISSUE': 3,
//     'DUSTBIN_FULL': 4,
//     'BATTERY_LOW': 5,
//   }
//   return errorMap[errorCode] ?? 1 // Default to generic error
// }
// ```
//
// ────────────────────────────────────────────────────────────────────────────
// 8. TESTING CHECKLIST
// ────────────────────────────────────────────────────────────────────────────
//
// Before deploying, test the following scenarios:
//
// ✓ Basic Operations:
//   - Start cleaning from Home app
//   - Pause/resume cleaning
//   - Return to dock command
//   - Mode changes (Idle, Quick, Auto, Mapping)
//   - Clean mode changes (Vacuum, Mop, Vacuum & Mop)
//
// ✓ Service Area (Room Selection):
//   - Select single room to clean
//   - Select multiple rooms
//   - Clean all rooms (no selection)
//   - Skip current room during cleaning
//
// ✓ State Synchronization:
//   - Start vacuum from manufacturer app → verify Home app updates
//   - Start vacuum from physical button → verify Home app updates
//   - Schedule cleaning → verify Home app shows correct state
//
// ✓ Error Conditions:
//   - Vacuum gets stuck → verify error state in Home app
//   - Battery depleted → verify battery reporting
//   - Connection loss → verify proper error handling
//
// ✓ Platform Compatibility:
//   - Test with Apple Home (iOS 18.4+ for room selection)
//   - Test with Google Home
//   - Test with other Matter controllers (if applicable)
//
// ✓ Performance:
//   - Verify state updates are timely (< 2 seconds)
//   - Check that polling doesn't overwhelm the vacuum API
//   - Monitor Homebridge logs for errors
//
// ════════════════════════════════════════════════════════════════════════════
