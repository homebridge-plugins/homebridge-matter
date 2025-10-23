/**
 * Window Covering Device (Matter Spec § 8.3)
 *
 * Handles multiple variants:
 * - Window Blind: Standard lift-only window covering
 * - Venetian Blind: Window covering with both lift and tilt control
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - WindowCovering cluster for motorized blinds/shades
 * - Multiple control commands (lift, tilt, stop)
 * - Position tracking in hundredths of percent
 */

import type { DeviceContext } from '../types.js'

export function registerWindowCovering(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  // Variant 1: Window Blind (lift only)
  if (config.enableWindowBlind) {
    accessories.push({
      uuid: api.matter.uuid.generate('matter-window-blind'),
      displayName: 'Window Blind',
      deviceType: api.matter.deviceTypes.WindowCovering,
      serialNumber: 'BLIND-001',
      manufacturer: 'Matter Examples',
      model: 'WindowBlind v1',

      clusters: {
        windowCovering: {
          // Target position (0 = fully closed, 10000 = fully open, in hundredths of percent)
          targetPositionLiftPercent100ths: 5000, // 50% open
          currentPositionLiftPercent100ths: 5000, // 50% open

          // Operational status
          operationalStatus: {
            global: 0, // Not moving
            lift: 0,
            tilt: 0,
          },

          // End product type
          endProductType: 0, // Rollershade

          // Configuration
          configStatus: {
            operational: true,
            onlineReserved: true,
            liftMovementReversed: false,
            liftPositionAware: true,
            tiltPositionAware: false,
            liftEncoderControlled: true,
            tiltEncoderControlled: false,
          },
        },
      },

      handlers: {
        windowCovering: {
          goToLiftPercentage: async (request: { targetPercent: number }) => {
            const percent = (request.targetPercent / 100).toFixed(0)
            log.info(`[Window Blind] Moving to ${percent}% open`)
            // TODO: await myBlindAPI.setPosition(percent)
          },

          upOrOpen: async () => {
            log.info('[Window Blind] Opening blind')
            // TODO: await myBlindAPI.open()
          },

          downOrClose: async () => {
            log.info('[Window Blind] Closing blind')
            // TODO: await myBlindAPI.close()
          },

          stopMotion: async () => {
            log.info('[Window Blind] Stopping blind')
            // TODO: await myBlindAPI.stop()
          },
        },
      },
    })
  }

  // Variant 2: Venetian Blind (lift + tilt)
  if (config.enableVenetianBlind) {
    accessories.push({
      uuid: api.matter.uuid.generate('matter-venetian-blind'),
      displayName: 'Venetian Blind (Tilt)',
      deviceType: api.matter.deviceTypes.WindowCovering,
      serialNumber: 'BLIND-002',
      manufacturer: 'Matter Examples',
      model: 'VenetianBlind v1',

      clusters: {
        windowCovering: {
          // Lift position (vertical position)
          targetPositionLiftPercent100ths: 5000, // 50% open
          currentPositionLiftPercent100ths: 5000,

          // Tilt position (slat angle: 0 = closed, 10000 = fully open)
          targetPositionTiltPercent100ths: 5000, // 50% tilted
          currentPositionTiltPercent100ths: 5000,

          // Operational status
          operationalStatus: {
            global: 0,
            lift: 0,
            tilt: 0,
          },

          // End product type
          endProductType: 8, // Venetian blind

          // Configuration: supports both lift and tilt
          configStatus: {
            operational: true,
            onlineReserved: true,
            liftMovementReversed: false,
            liftPositionAware: true,
            tiltPositionAware: true,
            liftEncoderControlled: true,
            tiltEncoderControlled: true,
          },
        },
      },

      handlers: {
        windowCovering: {
          goToLiftPercentage: async (request: { targetPercent: number }) => {
            const percent = (request.targetPercent / 100).toFixed(0)
            log.info(`[Venetian Blind] Moving to ${percent}% open`)
            // TODO: await myBlindAPI.setLiftPosition(percent)
          },

          goToTiltPercentage: async (request: { targetPercent: number }) => {
            const percent = (request.targetPercent / 100).toFixed(0)
            log.info(`[Venetian Blind] Tilting to ${percent}%`)
            // TODO: await myBlindAPI.setTiltAngle(percent)
          },

          upOrOpen: async () => {
            log.info('[Venetian Blind] Opening blind')
            // TODO: await myBlindAPI.open()
          },

          downOrClose: async () => {
            log.info('[Venetian Blind] Closing blind')
            // TODO: await myBlindAPI.close()
          },

          stopMotion: async () => {
            log.info('[Venetian Blind] Stopping blind')
            // TODO: await myBlindAPI.stop()
          },
        },
      },
    })
  }

  return accessories
}
