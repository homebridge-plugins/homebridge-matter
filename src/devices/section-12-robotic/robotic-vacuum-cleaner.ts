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
    clusters: {
      // RVC Run Mode Cluster (0x0054) - Defines operational modes
      rvcRunMode: {
        // Supported run modes (0=Idle, 1=Cleaning, 2=Mapping)
        // These are the modes users can select in the Home app
        supportedModes: [
          { label: 'Idle', mode: 0, modeTags: [{ value: 16384 }] }, // 16384 = Idle tag
          { label: 'Cleaning', mode: 1, modeTags: [{ value: 16385 }] }, // 16385 = Cleaning tag
          { label: 'Mapping', mode: 2, modeTags: [{ value: 16386 }] }, // 16386 = Mapping tag
        ],
        // Current mode - initial state
        currentMode: 0, // Start in Idle mode
      },

      // RVC Operational State Cluster (0x0061) - Tracks current activity
      rvcOperationalState: {
        // List of all possible operational states
        // Must include at least an error state (ID 3)
        operationalStateList: [
          { operationalStateId: 0 }, // Stopped
          { operationalStateId: 1 }, // Running
          { operationalStateId: 2 }, // Paused
          { operationalStateId: 3 }, // Error (REQUIRED by Matter spec)
          { operationalStateId: 64 }, // SeekingCharger
          { operationalStateId: 65 }, // Charging
          { operationalStateId: 66 }, // Docked
        ],

        // Current operational state (just the ID number, not an object)
        operationalState: 66, // Start in Docked state

        // Error state - indicates if device has an error
        operationalError: {
          errorStateId: 0, // No error
        },
      },

      // RVC Clean Mode Cluster (0x0055) - Defines cleaning method
      rvcCleanMode: {
        // Supported clean modes (0=Vacuum, 1=Mop, 2=Vacuum+Mop)
        // These are the cleaning methods users can select
        supportedModes: [
          { label: 'Vacuum', mode: 0, modeTags: [] },
          { label: 'Mop', mode: 1, modeTags: [] },
          { label: 'Vacuum & Mop', mode: 2, modeTags: [] },
        ],
        // Current clean mode - initial state
        currentMode: 0, // Start with Vacuum mode
      },
    },

    // Handlers respond to commands from Home apps (Apple Home, Google Home, etc.)
    // These are called when users interact with the device in their Home app
    handlers: {
      // RVC Operational State handlers - control device operation
      rvcOperationalState: {
        /**
         * pause() - Called when user presses "pause" in Home app
         *
         * In a real implementation:
         * - Send pause command to your actual robot vacuum
         * - Wait for confirmation
         * - Then update the Matter state
         */
        pause: async () => {
          log.info('[Robot Vacuum] ✓ Handler `pause` called - Pausing cleaning')

          // TODO: Send pause command to your actual robot vacuum here
          // Example: await yourVacuumAPI.pause()

          // Update Matter state to reflect the change
          // This notifies all connected Home apps of the new state
          return api.matter.updateAccessoryState(
            uuid, // Use the same UUID we generated above
            'rvcOperationalState',
            { operationalState: 2 }, // 2 = Paused
          )
        },

        /**
         * resume() - Called when user presses "resume" or "start" in Home app
         *
         * In a real implementation:
         * - Send start/resume command to your actual robot vacuum
         * - Wait for confirmation
         * - Then update the Matter state
         */
        resume: async () => {
          log.info('[Robot Vacuum] ✓ Handler `resume` called - Resuming cleaning')

          // TODO: Send resume command to your actual robot vacuum here
          // Example: await yourVacuumAPI.resume()

          // Update Matter state to Running
          return api.matter.updateAccessoryState(
            uuid,
            'rvcOperationalState',
            { operationalState: 1 }, // 1 = Running
          )
        },

        /**
         * goHome() - Called when user sends robot to charging dock
         *
         * In a real implementation:
         * - Send return-to-dock command to your actual robot vacuum
         * - Wait for confirmation
         * - Then update the Matter state
         */
        goHome: async () => {
          log.info('[Robot Vacuum] ✓ Handler `goHome` called - Returning to dock')

          // TODO: Send return-to-dock command to your actual robot vacuum here
          // Example: await yourVacuumAPI.returnToDock()

          // Update Matter state to SeekingCharger
          return api.matter.updateAccessoryState(
            uuid,
            'rvcOperationalState',
            { operationalState: 64 }, // 64 = SeekingCharger
          )

          // TIP: You could set up a timer or polling to detect when the vacuum
          // actually docks, then update to state 66 (Docked) or 65 (Charging)
        },
      },

      // RVC Run Mode handlers - change operational modes
      rvcRunMode: {
        /**
         * changeToMode() - Called when user changes the run mode
         *
         * Modes: 0=Idle, 1=Cleaning, 2=Mapping
         *
         * In a real implementation:
         * - Send mode change command to your actual robot vacuum
         * - Wait for confirmation
         * - Then update the Matter state
         */
        changeToMode: async (request: { newMode: number }) => {
          const modes = ['Idle', 'Cleaning', 'Mapping']
          const modeName = modes[request.newMode] || `Unknown (${request.newMode})`
          log.info(`[Robot Vacuum] ✓ Handler \`changeToMode\` called: ${request.newMode} (${modeName})`)

          // TODO: Send mode change command to your actual robot vacuum here
          // Example:
          // if (request.newMode === 1) {
          //   await yourVacuumAPI.startCleaning()
          // } else if (request.newMode === 2) {
          //   await yourVacuumAPI.startMapping()
          // } else {
          //   await yourVacuumAPI.idle()
          // }

          // Update Matter state
          return api.matter.updateAccessoryState(
            uuid,
            'rvcRunMode',
            { currentMode: request.newMode },
          )
        },
      },

      // RVC Clean Mode handlers - change cleaning method
      rvcCleanMode: {
        /**
         * changeToMode() - Called when user changes the clean mode
         *
         * Modes: 0=Vacuum, 1=Mop, 2=Vacuum & Mop
         *
         * In a real implementation:
         * - Send clean mode change command to your actual robot vacuum
         * - Wait for confirmation
         * - Then update the Matter state
         */
        changeToMode: async (request: { newMode: number }) => {
          const modes = ['Vacuum', 'Mop', 'Vacuum & Mop']
          const modeName = modes[request.newMode] || `Unknown (${request.newMode})`
          log.info(`[Robot Vacuum] ✓ Handler \`changeToMode\` (clean mode) called: ${request.newMode} (${modeName})`)

          // TODO: Send clean mode change to your actual robot vacuum here
          // Example:
          // if (request.newMode === 0) {
          //   await yourVacuumAPI.setMode('vacuum')
          // } else if (request.newMode === 1) {
          //   await yourVacuumAPI.setMode('mop')
          // } else if (request.newMode === 2) {
          //   await yourVacuumAPI.setMode('vacuum_and_mop')
          // }

          // Update Matter state
          return api.matter.updateAccessoryState(
            uuid,
            'rvcCleanMode',
            { currentMode: request.newMode },
          )
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

// ────────────────────────────────────────────────────────────────────────────
// DEVELOPER NOTES: Implementing a Real Robot Vacuum Integration
// ────────────────────────────────────────────────────────────────────────────
//
// This example uses static states and logs commands. For a real integration:
//
// 1. INITIAL SETUP:
//    - Store the robot vacuum API client in your platform instance
//    - Authenticate with the vacuum's cloud service or local API
//    - Set up any required polling or webhooks to receive state updates
//
// 2. STATE UPDATES FROM VACUUM:
//    When your vacuum's state changes (via app, button, schedule, etc.):
//    ```typescript
//    // Listen for state changes from your vacuum
//    vacuumAPI.on('stateChanged', (newState) => {
//      api.matter.updateAccessoryState(uuid, 'rvcOperationalState', {
//        operationalState: convertToMatterState(newState)
//      })
//    })
//    ```
//
// 3. COMMANDS TO VACUUM:
//    In your handlers, send actual commands to the vacuum:
//    ```typescript
//    pause: async () => {
//      try {
//        await vacuumAPI.pause()
//        log.info('Successfully paused vacuum')
//        return api.matter.updateAccessoryState(uuid, 'rvcOperationalState', {
//          operationalState: 2 // Paused
//        })
//      } catch (error) {
//        log.error('Failed to pause vacuum:', error)
//        // Optionally set error state
//        return api.matter.updateAccessoryState(uuid, 'rvcOperationalState', {
//          operationalState: 3, // Error
//          operationalError: { errorStateId: 1 }
//        })
//      }
//    }
//    ```
//
// 4. ERROR HANDLING:
//    - Always wrap API calls in try/catch
//    - Update Matter state to reflect errors
//    - Log detailed error information for debugging
//
// 5. BATTERY LEVEL (optional):
//    Add a PowerSource cluster to report battery:
//    ```typescript
//    clusters: {
//      powerSource: {
//        status: 1, // BatCharging
//        batChargeLevel: 80, // 0-100%
//      }
//    }
//    ```
//
// 6. TESTING:
//    - Test with Apple Home (requires external bridge - done automatically!)
//    - Test with Google Home
//    - Test with Alexa (if supported)
//    - Test all operational states and modes
//    - Test error conditions
//
// ────────────────────────────────────────────────────────────────────────────
