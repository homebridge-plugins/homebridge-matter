/**
 * On/Off Light Device (Matter Spec § 4.1)
 *
 * A basic lighting device that can be switched on or off.
 *
 * For comprehensive documentation on Matter concepts, handlers, state management,
 * and the two-way flow architecture, see:
 * ../../../MATTER_API.md
 *
 * This example demonstrates:
 * - Basic OnOff cluster implementation
 * - Handler setup for on/off commands (Flow A)
 * - Event-based state monitoring (Flow B)
 */

import type { DeviceContext } from '../types.js'

export function registerOnOffLight(context: DeviceContext): any[] {
  const { api, log, config } = context
  const accessories: any[] = []

  if (!config.enableOnOffLight) {
    return accessories
  }

  const accessory = {
    uuid: api.matter.uuid.generate('matter-onoff-light'),
    displayName: 'On/Off Light',
    deviceType: api.matter.deviceTypes.OnOffLight,
    serialNumber: 'LIGHT-001',
    manufacturer: 'Matter Examples',
    model: 'OnOffLight v1',

    // Optional: Store custom data that persists across restarts
    // context: {
    //   deviceId: 'my-light-123',
    //   apiToken: 'your-token-here',
    // },

    // Initial state (persisted automatically after first creation)
    clusters: {
      onOff: {
        onOff: true, // Initial state: light is on
      },
    },

    // FLOW A: Home App → Physical Device
    // Handlers are called when users control via Home app
    // State updates automatically after handler completes
    handlers: {
      onOff: {
        on: async () => {
          log.info('[On/Off Light] Turning ON')

          // TODO: Control your physical device
          // Examples:
          // await fetch('https://api.mydevice.com/light/on', { method: 'POST' })
          // await fetch('http://192.168.1.50/api/light/on')
          // mqttClient.publish('home/light/command', JSON.stringify({ state: 'ON' }))
          // await myLightAPI.turnOn(accessory.context.deviceId)

          log.info('[On/Off Light] Physical device turned ON')
          // State automatically updated by Homebridge
        },

        off: async () => {
          log.info('[On/Off Light] Turning OFF')

          // TODO: Control your physical device
          // await myLightAPI.turnOff(accessory.context.deviceId)

          log.info('[On/Off Light] Physical device turned OFF')
          // State automatically updated by Homebridge
        },
      },
    },
  }

  accessories.push(accessory)

  // ═══════════════════════════════════════════════════════════════════════════
  // FLOW B: Physical Device → Home App
  // ═══════════════════════════════════════════════════════════════════════════
  // Monitor your physical device and call updateAccessoryState() when it changes
  // See MATTER_API.md "Monitoring External Changes" for detailed examples

  // Example: Event-based monitoring (recommended)
  const startEventListener = () => {
    // MQTT Example:
    // mqttClient.subscribe('home/light/status')
    // mqttClient.on('message', (topic, message) => {
    //   const { state } = JSON.parse(message.toString())
    //   const deviceIsOn = state === 'ON'
    //   const currentState = accessory.clusters.onOff.onOff
    //
    //   if (deviceIsOn !== currentState) {
    //     api.matter.updateAccessoryState(
    //       accessory.uuid,
    //       api.matter.clusterNames.OnOff,
    //       { onOff: deviceIsOn }
    //     )
    //     log.info(`[On/Off Light] State synced: ${deviceIsOn ? 'ON' : 'OFF'}`)
    //   }
    // })

    // WebSocket Example:
    // const ws = new WebSocket('wss://api.mydevice.com/events')
    // ws.on('message', (data) => {
    //   const event = JSON.parse(data.toString())
    //   if (event.type === 'state_changed') {
    //     const deviceIsOn = event.state === 'ON'
    //     const currentState = accessory.clusters.onOff.onOff
    //
    //     if (deviceIsOn !== currentState) {
    //       api.matter.updateAccessoryState(
    //         accessory.uuid,
    //         api.matter.clusterNames.OnOff,
    //         { onOff: deviceIsOn }
    //       )
    //     }
    //   }
    // })
  }

  // Uncomment to enable event listener:
  // startEventListener()

  // Example: Polling-based monitoring (fallback)
  const startPolling = () => {
    setInterval(async () => {
      try {
        // TODO: Fetch state from your physical device
        // const response = await fetch('https://api.mydevice.com/light/state')
        // const data = await response.json()
        // const deviceIsOn = data.power === 'on'
        const deviceIsOn = true // Replace with actual fetch

        const currentState = accessory.clusters.onOff.onOff
        if (deviceIsOn !== currentState) {
          api.matter.updateAccessoryState(
            accessory.uuid,
            api.matter.clusterNames.OnOff,
            { onOff: deviceIsOn },
          )
          log.info(`[On/Off Light] State synced: ${deviceIsOn ? 'ON' : 'OFF'}`)
        }
      } catch (error) {
        log.error(`[On/Off Light] Polling error: ${error}`)
      }
    }, 5000) // Poll every 5 seconds
  }

  // Uncomment to enable polling (use events if possible!):
  // startPolling()

  return accessories
}
