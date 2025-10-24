/**
 * Dimmable Light Device (Matter Spec § 4.2)
 *
 * A lighting device with on/off and level control (brightness).
 *
 * For comprehensive documentation, see: ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - Multiple clusters (OnOff + LevelControl)
 * - Type-safe handlers with MatterRequests
 * - Brightness value conversion (Matter 1-254 ↔ Percent 0-100%)
 */

import type { MatterAccessory, MatterRequests } from 'homebridge'

import type { DeviceContext } from '../types.js'

export function registerDimmableLight(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: MatterAccessory[] = []

  if (!config.enableDimmableLight) {
    return accessories
  }

  const accessory = {
    uuid: api.matter.uuid.generate('matter-dimmable-light'),
    displayName: 'Dimmable Light',
    deviceType: api.matter.deviceTypes.DimmableLight,
    serialNumber: 'LIGHT-002',
    manufacturer: 'Matter Examples',
    model: 'DimmableLight v1',

    clusters: {
      onOff: {
        onOff: false,
      },
      levelControl: {
        currentLevel: 127, // 50% brightness (range 1-254)
        minLevel: 1,
        maxLevel: 254,
      },
    },

    handlers: {
      onOff: {
        on: async () => {
          log.info('[Dimmable Light] Turning ON')
          // TODO: await myLightAPI.turnOn()
        },

        off: async () => {
          log.info('[Dimmable Light] Turning OFF')
          // TODO: await myLightAPI.turnOff()
        },
      },

      levelControl: {
        // Type-safe handler with MatterRequests
        moveToLevelWithOnOff: async (request: MatterRequests.MoveToLevel) => {
          const { level, transitionTime } = request

          // Convert Matter level (1-254) to percentage (0-100%)
          const brightnessPercent = Math.round((level / 254) * 100)
          log.info(`[Dimmable Light] Setting brightness to ${brightnessPercent}% (level: ${level})`)

          // TODO: await myLightAPI.setBrightness(brightnessPercent, transitionTime)
        },
      },
    },
  }

  accessories.push(accessory)

  // FLOW B: Monitor for external changes
  // Example: MQTT listener
  // mqttClient.on('message', (topic, message) => {
  //   const { state, brightness } = JSON.parse(message.toString())
  //
  //   // Update on/off state
  //   const deviceIsOn = state === 'ON'
  //   if (deviceIsOn !== accessory.clusters.onOff.onOff) {
  //     api.matter.updateAccessoryState(
  //       accessory.uuid,
  //       api.matter.clusterNames.OnOff,
  //       { onOff: deviceIsOn }
  //     )
  //   }
  //
  //   // Update brightness (convert percent to Matter level)
  //   const matterLevel = Math.max(1, Math.round((brightness / 100) * 254))
  //   if (matterLevel !== accessory.clusters.levelControl.currentLevel) {
  //     api.matter.updateAccessoryState(
  //       accessory.uuid,
  //       api.matter.clusterNames.LevelControl,
  //       { currentLevel: matterLevel }
  //     )
  //   }
  // })

  return accessories
}
