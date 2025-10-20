/**
 * Window Covering Device (Matter Spec § 8.3)
 *
 * Handles multiple variants:
 * - Window Blind: Standard lift-only window covering
 * - Venetian Blind: Window covering with both lift and tilt control
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
            log.info(`[Window Blind] ✓ Handler \`goToLiftPercentage\` called: ${request.targetPercent} (${percent}% open)`)

            await api.matter.updateAccessoryState(
              api.matter.uuid.generate('matter-window-blind'),
              'windowCovering',
              {
                currentPositionLiftPercent100ths: request.targetPercent,
                targetPositionLiftPercent100ths: request.targetPercent,
              },
            )
          },

          upOrOpen: async () => {
            log.info('[Window Blind] ✓ Handler `upOrOpen` called - Opening blind')

            await api.matter.updateAccessoryState(
              api.matter.uuid.generate('matter-window-blind'),
              'windowCovering',
              {
                currentPositionLiftPercent100ths: 10000, // Fully open
                targetPositionLiftPercent100ths: 10000,
              },
            )
          },

          downOrClose: async () => {
            log.info('[Window Blind] ✓ Handler `downOrClose` called - Closing blind')

            await api.matter.updateAccessoryState(
              api.matter.uuid.generate('matter-window-blind'),
              'windowCovering',
              {
                currentPositionLiftPercent100ths: 0, // Fully closed
                targetPositionLiftPercent100ths: 0,
              },
            )
          },

          stopMotion: async () => {
            log.info('[Window Blind] ✓ Handler `stopMotion` called - Stopping blind')
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
            log.info(`[Venetian Blind] ✓ Handler \`goToLiftPercentage\` called: ${request.targetPercent} (${percent}% open)`)

            await api.matter.updateAccessoryState(
              api.matter.uuid.generate('matter-venetian-blind'),
              'windowCovering',
              {
                currentPositionLiftPercent100ths: request.targetPercent,
                targetPositionLiftPercent100ths: request.targetPercent,
              },
            )
          },

          goToTiltPercentage: async (request: { targetPercent: number }) => {
            const percent = (request.targetPercent / 100).toFixed(0)
            log.info(`[Venetian Blind] ✓ Handler \`goToTiltPercentage\` called: ${request.targetPercent} (${percent}% tilted)`)

            await api.matter.updateAccessoryState(
              api.matter.uuid.generate('matter-venetian-blind'),
              'windowCovering',
              {
                currentPositionTiltPercent100ths: request.targetPercent,
                targetPositionTiltPercent100ths: request.targetPercent,
              },
            )
          },

          upOrOpen: async () => {
            log.info('[Venetian Blind] ✓ Handler `upOrOpen` called - Opening blind')

            await api.matter.updateAccessoryState(
              api.matter.uuid.generate('matter-venetian-blind'),
              'windowCovering',
              {
                currentPositionLiftPercent100ths: 10000, // Fully open
                targetPositionLiftPercent100ths: 10000,
              },
            )
          },

          downOrClose: async () => {
            log.info('[Venetian Blind] ✓ Handler `downOrClose` called - Closing blind')

            await api.matter.updateAccessoryState(
              api.matter.uuid.generate('matter-venetian-blind'),
              'windowCovering',
              {
                currentPositionLiftPercent100ths: 0, // Fully closed
                targetPositionLiftPercent100ths: 0,
              },
            )
          },

          stopMotion: async () => {
            log.info('[Venetian Blind] ✓ Handler `stopMotion` called - Stopping blind')
          },
        },
      },
    })
  }

  return accessories
}
