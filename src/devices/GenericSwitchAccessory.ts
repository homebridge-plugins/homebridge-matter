/**
 * Generic Switch Accessory Class
 *
 * Stateless button / remote (Matter Spec § 6.6, device type 0x000F).
 *
 * Unlike OnOffSwitch, GenericSwitch has no persistent on/off state — it models
 * physical button presses on a remote (e.g. Pico remotes, scene controllers).
 * There are NO command handlers: events are emitted by Matter.js automatically
 * when the `switch.currentPosition` attribute changes. Use the public helpers
 * below to trigger button presses programmatically.
 *
 * `numberOfPositions` describes how many positions (including the "released"
 * position 0) the switch has. A simple single-button remote uses 2 (released
 * + pressed); a 3-button remote uses 4 (released + button 1, 2, 3).
 */

import type { API, Logger } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class GenericSwitchAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-generic-switch'
    const matter = getMatter(api)
    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'Generic Switch',
      deviceType: matter.deviceTypes.GenericSwitch,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-SWITCH-GENERIC',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        switch: {
          // 0 = released; ≥1 = a specific button position pressed.
          currentPosition: 0,
          // For a multi-button remote, set this to (1 + number of buttons).
          numberOfPositions: 2,
        },
      },

      // No handlers: GenericSwitch is stateless. Matter.js's SwitchServer fires
      // initialPress / shortRelease / longRelease / multiPressComplete events
      // automatically when currentPosition changes via the helpers below.
    })

    this.logInfo('initialized (stateless — trigger events via singlePress/doublePress/longPress).')
  }

  /**
   * Press a button. Pair with `releaseButton` to complete the cycle.
   * Matter.js will fire `initialPress` immediately and then `shortRelease` or
   * `longRelease` when you release, depending on how long the button was held.
   *
   * @param position - Button position (1-based). Defaults to 1.
   * @param partId - Part ID for composed devices.
   */
  public async pressButton(position: number = 1, partId?: string): Promise<void> {
    await this.matter.switch.emit(this.UUID, 'press', { position, partId })
    this.logInfo(`button ${position} pressed.`)
  }

  /**
   * Release the currently pressed button.
   *
   * @param partId - Part ID for composed devices.
   */
  public async releaseButton(partId?: string): Promise<void> {
    await this.matter.switch.emit(this.UUID, 'release', { partId })
    this.logInfo('button released.')
  }

  /**
   * Emit a single press (press → release).
   *
   * @param position - Button position (1-based). Defaults to 1.
   * @param partId - Part ID for composed devices.
   */
  public async singlePress(position: number = 1, partId?: string): Promise<void> {
    this.logInfo(`single press on button ${position}.`)
    await this.matter.switch.emitGesture(this.UUID, 'singlePress', { position, partId })
  }

  /**
   * Emit a double press (two press/release cycles within `multiPressDelayMs`).
   *
   * @param position - Button position (1-based). Defaults to 1.
   * @param partId - Part ID for composed devices.
   * @param multiPressDelayMs - Delay between cycles. Defaults to 100ms.
   */
  public async doublePress(position: number = 1, partId?: string, multiPressDelayMs?: number): Promise<void> {
    this.logInfo(`double press on button ${position}.`)
    await this.matter.switch.emitGesture(this.UUID, 'doublePress', { position, partId, multiPressDelayMs })
  }

  /**
   * Emit a long press (press, hold for `longPressDelayMs`, release).
   *
   * @param position - Button position (1-based). Defaults to 1.
   * @param partId - Part ID for composed devices.
   * @param longPressDelayMs - How long to hold. Defaults to 2500ms.
   */
  public async longPress(position: number = 1, partId?: string, longPressDelayMs?: number): Promise<void> {
    this.logInfo(`long press on button ${position}.`)
    await this.matter.switch.emitGesture(this.UUID, 'longPress', { position, partId, longPressDelayMs })
  }

  /**
   * Example monitoring setup
   */
  public startMonitoring(): void {
    // Example: MQTT — translate device button events to Matter switch events
    // mqttClient.subscribe('home/remote/+/event')
    // mqttClient.on('message', (topic, message) => {
    //   const button = Number(topic.split('/')[2])
    //   const event = message.toString() // 'single' | 'double' | 'long'
    //   if (event === 'single') this.singlePress(button)
    //   else if (event === 'double') this.doublePress(button)
    //   else if (event === 'long') this.longPress(button)
    // })

    // Example: Webhook — for remotes that POST on press
    // app.post('/remote/:button/:gesture', async (req, res) => {
    //   const button = Number(req.params.button)
    //   await this.singlePress(button)
    //   res.sendStatus(200)
    // })
  }
}
