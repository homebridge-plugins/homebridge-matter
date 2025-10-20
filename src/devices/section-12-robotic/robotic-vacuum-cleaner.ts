/**
 * Robotic Vacuum Cleaner Device (Matter Spec § 12.1)
 *
 * A robotic vacuum cleaner with autonomous cleaning capabilities.
 *
 * ✅ Apple Home Compatibility - EXTERNAL ACCESSORIES
 * This device is published using api.matter.publishExternalAccessories() in platform.ts.
 * RVC devices MUST be on their own dedicated Matter bridge for Apple Home compatibility.
 *
 * IMPORTANT: This function only CREATES the accessory configuration.
 * The actual publishing happens in platform.ts using publishExternalAccessories().
 *
 * What happens when this device is published as external:
 * ─────────────────────────────────────────────────────────────
 * 1. Dedicated Matter Server: Gets its own MatterServer instance
 * 2. Automatic Port Allocation: Receives a unique port (e.g., 5541)
 * 3. Separate Commissioning: Gets its own QR code and manual pairing code
 * 4. Isolation: Completely independent of other Matter accessories
 * 5. Apple Home Compatible: Works properly with Apple Home's RVC requirements
 *
 * When you start Homebridge, you'll see logs like:
 * ```
 * [Matter] Publishing 1 external Matter accessory
 * [Matter] Allocated port 5541 for external Matter accessory: Robot Vacuum
 * [Matter] ✓ External Matter accessory published: Robot Vacuum on port 5541
 * [Matter] 📱 Commissioning codes for Robot Vacuum:
 * [Matter]    QR Code: MT:Y.K9042C00KA0648G00
 * [Matter]    Manual Code: 3492-8840-7309-5200-911
 * ```
 *
 * Use the separate QR code to commission this device in Apple Home.
 *
 * For developers implementing similar devices:
 * ──────────────────────────────────────────────
 * If you need to create your own device that requires isolation (like cameras,
 * doorbells, or other complex devices that Apple Home requires on separate bridges),
 * follow this pattern:
 *
 * 1. Create the accessory configuration in a device file (like this one)
 * 2. Return it from your registration function
 * 3. In platform.ts, use api.matter.publishExternalAccessories() instead of
 *    api.matter.registerPlatformAccessories()
 *
 * Example in your platform.ts:
 * ```typescript
 * const accessories = [...registerYourDevice(context)]
 * if (accessories.length > 0) {
 *   // Use publishExternalAccessories for devices that need isolation
 *   this.api.matter.publishExternalAccessories(PLUGIN_NAME, accessories)
 * }
 * ```
 */

import { MatterTypes } from 'homebridge'

import type { DeviceContext } from '../types.js'

/**
 * Registers a Robotic Vacuum Cleaner accessory.
 *
 * NOTE: This returns the accessory configuration but does NOT publish it.
 * Publishing happens in platform.ts using api.matter.publishExternalAccessories().
 *
 * @param context - Device context containing API, logger, and config
 * @returns Array of RVC accessory configurations (empty if disabled)
 */
export function registerRoboticVacuumCleaner(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  if (!config.enableRobotVacuum) {
    return accessories
  }

  // Generate UUID for this accessory - will be used for external bridge identification
  const uuid = api.matter.uuid.generate('matter-robot-vacuum')

  accessories.push({
    // Unique identifier for this accessory
    // This UUID will also be used to identify the external Matter bridge
    uuid,

    // Display name shown in Home apps
    displayName: 'Robot Vacuum',

    // Matter device type - RoboticVacuumCleaner (from Matter Spec § 12.1)
    deviceType: api.matter.deviceTypes.RoboticVacuumCleaner,

    // Device identification
    serialNumber: 'VACUUM-001',
    manufacturer: 'Matter Examples',
    model: 'RobotVacuum v1',

    // Matter clusters define the functionality of this device
    // RVC devices require these three clusters: rvcRunMode, rvcOperationalState, rvcCleanMode
    // Optional clusters: serviceArea (Matter 1.4+)
    clusters: {
      // ════════════════════════════════════════════════════════════════════════════
      // RVC Run Mode Cluster (0x0054) - Defines operational modes
      // ════════════════════════════════════════════════════════════════════════════
      rvcRunMode: {
        // Supported run modes with enhanced mode tags for better controller compatibility
        // Mode tags help controllers understand the purpose and behavior of each mode
        supportedModes: [
          {
            label: 'Idle',
            mode: 0,
            modeTags: [
              { value: MatterTypes.RvcRunMode.ModeTag.Idle },
            ],
          },
          {
            label: 'Quick-Cleaning',
            mode: 1,
            modeTags: [
              { value: MatterTypes.RvcRunMode.ModeTag.Cleaning },
              { value: MatterTypes.ModeBase.ModeTag.Quick },
            ],
          },
          {
            label: 'Auto-Cleaning',
            mode: 2,
            modeTags: [
              { value: MatterTypes.RvcRunMode.ModeTag.Cleaning },
              { value: MatterTypes.ModeBase.ModeTag.Auto },
            ],
          },
          {
            label: 'Mapping',
            mode: 3,
            modeTags: [
              { value: MatterTypes.RvcRunMode.ModeTag.Mapping },
            ],
          },
        ],
        // Current mode - initial state
        currentMode: 0, // Start in Idle mode
      },

      // ════════════════════════════════════════════════════════════════════════════
      // RVC Operational State Cluster (0x0061) - Tracks current activity
      // ════════════════════════════════════════════════════════════════════════════
      rvcOperationalState: {
        // List of all possible operational states with descriptive labels
        // Labels help with debugging and may be displayed in some controllers
        // Must include at least an error state (ID 3) per Matter spec
        operationalStateList: [
          {
            operationalStateId: MatterTypes.RvcOperationalState.OperationalState.Stopped,
            operationalStateLabel: 'Stopped',
          },
          {
            operationalStateId: MatterTypes.RvcOperationalState.OperationalState.Running,
            operationalStateLabel: 'Running',
          },
          {
            operationalStateId: MatterTypes.RvcOperationalState.OperationalState.Paused,
            operationalStateLabel: 'Paused',
          },
          {
            operationalStateId: MatterTypes.RvcOperationalState.OperationalState.Error,
            operationalStateLabel: 'Error',
          }, // REQUIRED by Matter spec
          {
            operationalStateId: MatterTypes.RvcOperationalState.OperationalState.SeekingCharger,
            operationalStateLabel: 'Seeking Charger',
          },
          {
            operationalStateId: MatterTypes.RvcOperationalState.OperationalState.Charging,
            operationalStateLabel: 'Charging',
          },
          {
            operationalStateId: MatterTypes.RvcOperationalState.OperationalState.Docked,
            operationalStateLabel: 'Docked',
          },
        ],

        // Current operational state (just the ID number, not an object)
        operationalState: MatterTypes.RvcOperationalState.OperationalState.Docked, // Start in Docked state

        // Error state - indicates if device has an error
        operationalError: {
          errorStateId: MatterTypes.OperationalState.ErrorState.NoError, // No error
          errorStateLabel: '', // Empty when no error
        },
      },

      // ════════════════════════════════════════════════════════════════════════════
      // RVC Clean Mode Cluster (0x0055) - Defines cleaning method
      // ════════════════════════════════════════════════════════════════════════════
      rvcCleanMode: {
        // Supported clean modes with appropriate tags
        // You can add more modes like Quiet, Turbo, Deep Clean, etc.
        supportedModes: [
          {
            label: 'Vacuum',
            mode: 0,
            modeTags: [
              { value: MatterTypes.RvcCleanMode.ModeTag.Vacuum },
            ],
          },
          {
            label: 'Mop',
            mode: 1,
            modeTags: [
              { value: MatterTypes.RvcCleanMode.ModeTag.Mop },
            ],
          },
          {
            label: 'Vacuum & Mop',
            mode: 2,
            modeTags: [
              { value: MatterTypes.RvcCleanMode.ModeTag.Vacuum },
              { value: MatterTypes.RvcCleanMode.ModeTag.Mop }, // Both tags for combined mode
            ],
          },
        ],
        // Current clean mode - initial state
        currentMode: 0, // Start with Vacuum mode
      },

      // ════════════════════════════════════════════════════════════════════════════
      // Service Area Cluster (Matter 1.4+) - Zone/Room-based cleaning
      // ════════════════════════════════════════════════════════════════════════════
      //
      // The Service Area cluster enables room/zone-specific cleaning, which is a key
      // feature introduced in Matter 1.4. This allows users to:
      // - Select specific rooms to clean from their Home app (iOS 18.4+)
      // - Track which room is currently being cleaned
      // - Define multiple cleaning zones/maps
      //
      // IMPORTANT: This cluster is OPTIONAL but highly recommended for modern RVC devices.
      // Controllers that don't support it will simply not show room selection options.
      serviceArea: {
        // Define available floor plan maps
        // Even if you only have one floor plan, you must define at least one map
        supportedMaps: [
          {
            mapId: 0, // Map ID - use 0 for the default/only map
            name: 'Main Floor', // Friendly name for this map
          },
        ],

        // Define the rooms/areas available for cleaning
        // Each area has metadata like name, floor number, and area type tags
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
         * Best practices:
         * 1. Validate current state (can't pause if docked/charging)
         * 2. Send command to physical device
         * 3. Wait for confirmation
         * 4. Update Matter state
         * 5. Handle errors appropriately
         */
        pause: async () => {
          log.info('[Robot Vacuum] ✓ Handler `pause` called - Pausing cleaning')

          try {
            // TODO: Add validation - can we pause in current state?
            // const currentState = accessory.clusters.rvcOperationalState.operationalState
            // if (currentState === MatterTypes.RvcOperationalState.OperationalState.Charging ||
            //     currentState === MatterTypes.RvcOperationalState.OperationalState.Docked) {
            //   throw new Error('Cannot pause while docked or charging')
            // }

            // TODO: Send pause command to your actual robot vacuum
            // Example: await yourVacuumAPI.pause()

            // Update Matter state to reflect the change
            return api.matter.updateAccessoryState(
              uuid,
              'rvcOperationalState',
              { operationalState: MatterTypes.RvcOperationalState.OperationalState.Paused },
            )
          } catch (error) {
            log.error('[Robot Vacuum] Failed to pause:', error)
            // Update to error state
            return api.matter.updateAccessoryState(
              uuid,
              'rvcOperationalState',
              {
                operationalState: MatterTypes.RvcOperationalState.OperationalState.Error,
                operationalError: {
                  errorStateId: 1, // Generic error
                  errorStateLabel: 'Failed to pause vacuum',
                },
              },
            )
          }
        },

        /**
         * resume() - Called when user presses "resume" or "start" in Home app
         *
         * This should resume a paused cleaning session or start a new one.
         * Make sure to validate the current state before resuming.
         */
        resume: async () => {
          log.info('[Robot Vacuum] ✓ Handler `resume` called - Resuming cleaning')

          try {
            // TODO: Add validation
            // const currentState = accessory.clusters.rvcOperationalState.operationalState
            // if (currentState === MatterTypes.RvcOperationalState.OperationalState.SeekingCharger) {
            //   throw new Error('Cannot resume while seeking charger')
            // }

            // TODO: Send resume command to your actual robot vacuum
            // Example: await yourVacuumAPI.resume()

            // Update Matter state to Running
            return api.matter.updateAccessoryState(
              uuid,
              'rvcOperationalState',
              { operationalState: MatterTypes.RvcOperationalState.OperationalState.Running },
            )
          } catch (error) {
            log.error('[Robot Vacuum] Failed to resume:', error)
            return api.matter.updateAccessoryState(
              uuid,
              'rvcOperationalState',
              {
                operationalState: MatterTypes.RvcOperationalState.OperationalState.Error,
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
         * This command should interrupt any current activity and return
         * the vacuum to its charging station.
         */
        goHome: async () => {
          log.info('[Robot Vacuum] ✓ Handler `goHome` called - Returning to dock')

          try {
            // TODO: Send return-to-dock command to your actual robot vacuum
            // Example: await yourVacuumAPI.returnToDock()

            // Clear current area when returning home
            api.matter.updateAccessoryState(uuid, 'serviceArea', {
              currentArea: null,
            })

            // Update Matter state to SeekingCharger
            return api.matter.updateAccessoryState(
              uuid,
              'rvcOperationalState',
              { operationalState: MatterTypes.RvcOperationalState.OperationalState.SeekingCharger },
            )

            // TIP: Set up monitoring to track docking progress:
            // - When vacuum reaches dock: update to Charging state
            // - When fully charged: update to Docked state
            // Example:
            // await api.matter.updateAccessoryState(uuid, 'rvcOperationalState', {
            //   operationalState: MatterTypes.RvcOperationalState.OperationalState.Charging
            // })
          } catch (error) {
            log.error('[Robot Vacuum] Failed to return home:', error)
            return api.matter.updateAccessoryState(
              uuid,
              'rvcOperationalState',
              {
                operationalState: MatterTypes.RvcOperationalState.OperationalState.Error,
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
         * 1 = Quick-Cleaning - Single cleaning cycle
         * 2 = Auto-Cleaning - Continuous/scheduled cleaning
         * 3 = Mapping - Map the environment
         *
         * Implementation notes:
         * - Changing to a cleaning mode should start the vacuum
         * - Changing to Idle should stop current activity
         * - Update operational state accordingly
         */
        changeToMode: async (request: { newMode: number }) => {
          const modes = ['Idle', 'Quick-Cleaning', 'Auto-Cleaning', 'Mapping']
          const modeName = modes[request.newMode] || `Unknown (${request.newMode})`
          log.info(`[Robot Vacuum] ✓ Handler \`changeToMode\` (run mode) called: ${request.newMode} (${modeName})`)

          try {
            // TODO: Send mode change command to your actual robot vacuum
            // Example:
            // if (request.newMode === 0) {
            //   await yourVacuumAPI.stop()
            // } else if (request.newMode === 1 || request.newMode === 2) {
            //   await yourVacuumAPI.startCleaning()
            // } else if (request.newMode === 3) {
            //   await yourVacuumAPI.startMapping()
            // }

            // Update Matter state
            return api.matter.updateAccessoryState(
              uuid,
              'rvcRunMode',
              { currentMode: request.newMode },
            )
          } catch (error) {
            log.error('[Robot Vacuum] Failed to change run mode:', error)
            return api.matter.updateAccessoryState(
              uuid,
              'rvcOperationalState',
              {
                operationalState: MatterTypes.RvcOperationalState.OperationalState.Error,
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
              'rvcCleanMode',
              { currentMode: request.newMode },
            )
          } catch (error) {
            log.error('[Robot Vacuum] Failed to change clean mode:', error)
            return api.matter.updateAccessoryState(
              uuid,
              'rvcOperationalState',
              {
                operationalState: MatterTypes.RvcOperationalState.OperationalState.Error,
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
         * @param request.areas - Array of area IDs to clean
         *
         * Example usage:
         * - User selects "Kitchen" and "Living Room" in Home app
         * - request.areas = [0, 1] (Kitchen=0, Living Room=1)
         * - Empty array means "clean all areas"
         */
        selectAreas: async (request: { areas: number[] }) => {
          const areaNames = ['Kitchen', 'Living Room', 'Bedroom', 'Bathroom']
          const selectedNames = request.areas.map(id => areaNames[id] || `Area ${id}`)
          log.info(`[Robot Vacuum] ✓ Handler \`selectAreas\` called - Selected areas: ${selectedNames.join(', ') || 'All areas'}`)

          try {
            // TODO: Send area selection to your actual robot vacuum
            // Example:
            // if (request.areas.length > 0) {
            //   await yourVacuumAPI.setCleaningAreas(request.areas)
            // } else {
            //   await yourVacuumAPI.setCleaningAreas('all')
            // }

            // Update Matter state
            return api.matter.updateAccessoryState(
              uuid,
              'serviceArea',
              { selectedAreas: request.areas },
            )
          } catch (error) {
            log.error('[Robot Vacuum] Failed to select areas:', error)
            return api.matter.updateAccessoryState(
              uuid,
              'rvcOperationalState',
              {
                operationalState: MatterTypes.RvcOperationalState.OperationalState.Error,
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
              'rvcOperationalState',
              {
                operationalState: MatterTypes.RvcOperationalState.OperationalState.Error,
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
//     'idle': MatterTypes.RvcOperationalState.OperationalState.Stopped,
//     'cleaning': MatterTypes.RvcOperationalState.OperationalState.Running,
//     'paused': MatterTypes.RvcOperationalState.OperationalState.Paused,
//     'error': MatterTypes.RvcOperationalState.OperationalState.Error,
//     'returning': MatterTypes.RvcOperationalState.OperationalState.SeekingCharger,
//     'charging': MatterTypes.RvcOperationalState.OperationalState.Charging,
//     'docked': MatterTypes.RvcOperationalState.OperationalState.Docked
//   }
//   return stateMap[status] ?? MatterTypes.RvcOperationalState.OperationalState.Stopped
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
//           operationalState: MatterTypes.RvcOperationalState.OperationalState.Paused
//         })
//       } catch (error) {
//         log.error('Failed to pause vacuum:', error)
//         return api.matter.updateAccessoryState(uuid, 'rvcOperationalState', {
//           operationalState: MatterTypes.RvcOperationalState.OperationalState.Error,
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
//       operationalState: MatterTypes.RvcOperationalState.OperationalState.Running
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
//       operationalState: MatterTypes.RvcOperationalState.OperationalState.SeekingCharger
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
//     MatterTypes.RvcOperationalState.OperationalState.SeekingCharger,
//     MatterTypes.RvcOperationalState.OperationalState.Charging,
//     MatterTypes.RvcOperationalState.OperationalState.Docked
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
