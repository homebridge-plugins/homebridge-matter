/**
 * Water Heater Accessory Class
 *
 * A hot water tank with a heating-only thermostat, an operating mode (Off,
 * Manual, Timed) and a boost (Matter Spec § 14.2). Requires Homebridge v2.5.0
 * or later.
 *
 * A water heater is three clusters:
 * - thermostat: the water temperature (as externalMeasuredIndoorTemperature)
 *   and the target temperature (as occupiedHeatingSetpoint). It only heats.
 * - waterHeaterMode: the supported modes and the current one
 * - waterHeaterManagement: the heat sources, which of them are heating now,
 *   and whether a boost is running
 *
 * matter.js will not build the endpoint without waterHeaterMode's
 * supportedModes and currentMode, or waterHeaterManagement's heaterTypes,
 * heatDemand and boostState - so all of them are declared below.
 *
 * ⚠️ It is not yet known how Apple Home presents this device type. Test it
 * there before replacing a heating-only Thermostat that already works.
 */

import type { API, Logger } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

// Mode tags from the Matter spec. Every water heater needs one mode tagged Off
// and one tagged Manual. A mode tagged Off, Manual or Timed carries no other
// tag.
const MODE_TAG_OFF = 0x4000
const MODE_TAG_MANUAL = 0x4001
const MODE_TAG_TIMED = 0x4002

const MODE_OFF = 0
const MODE_MANUAL = 1
const MODE_TIMED = 2

// boostState: 0 = inactive, 1 = active
const BOOST_INACTIVE = 0
const BOOST_ACTIVE = 1

export class WaterHeaterAccessory extends BaseMatterAccessory {
  private boostTimer?: ReturnType<typeof setTimeout>

  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-water-heater'
    const matter = getMatter(api)
    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'Water Heater',
      deviceType: matter.deviceTypes.WaterHeater,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-WATER-HEATER',
      firmwareRevision: '1.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        thermostat: {
          externalMeasuredIndoorTemperature: 4800, // water at 48.00°C
          occupiedHeatingSetpoint: 5500, // heat it to 55.00°C
          // The absolute limits default to a room thermostat's (7°C - 30°C),
          // so a water heater has to declare its own - otherwise matter.js
          // pulls the limits and the target down to 30°C
          absMinHeatSetpointLimit: 3000, // 30.00°C
          absMaxHeatSetpointLimit: 6500, // 65.00°C
          minHeatSetpointLimit: 3000,
          maxHeatSetpointLimit: 6500,
          controlSequenceOfOperation: 2, // heating only
          systemMode: 4, // heat
        },
        waterHeaterMode: {
          supportedModes: [
            {
              label: 'Off',
              mode: MODE_OFF,
              modeTags: [
                { value: MODE_TAG_OFF },
              ],
            },
            {
              label: 'Manual',
              mode: MODE_MANUAL,
              modeTags: [
                { value: MODE_TAG_MANUAL },
              ],
            },
            {
              label: 'Timed',
              mode: MODE_TIMED,
              modeTags: [
                { value: MODE_TAG_TIMED },
              ],
            },
          ],
          currentMode: MODE_MANUAL,
        },
        waterHeaterManagement: {
          // The heat sources this tank has
          heaterTypes: { immersionElement1: true, heatPump: true },
          // Which of them are heating right now
          heatDemand: {},
          boostState: BOOST_INACTIVE,
          // tankVolume and estimatedHeatRequired need the EnergyManagement
          // feature, and tankPercentage the TankPercent feature. Homebridge
          // does not turn these on from the state, so declaring them alone
          // fails - compose the cluster with
          // deviceRequirements.WaterHeater.WaterHeaterManagementServer.with(...)
          // first (see the Customising Features page on the wiki).
        },
      },

      handlers: {
        thermostat: {
          occupiedHeatingSetpointChange: async request => this.handleTargetTemperatureChange(request),
        },
        waterHeaterMode: {
          changeToMode: async request => this.handleModeChange(request.newMode),
        },
        waterHeaterManagement: {
          boost: async request => this.handleBoost(request.boostInfo.duration),
          cancelBoost: async () => this.handleCancelBoost(),
        },
      },
    })

    this.logInfo('initialized.')
  }

  private async handleTargetTemperatureChange(request: { occupiedHeatingSetpoint: number, oldOccupiedHeatingSetpoint: number }): Promise<void> {
    this.logInfo(`target temperature changed to: ${request.occupiedHeatingSetpoint / 100}°C.`)
    // TODO: await myWaterHeaterAPI.setTargetTemperature(request.occupiedHeatingSetpoint / 100)
  }

  private async handleModeChange(newMode: number): Promise<void> {
    const modeName = ['Off', 'Manual', 'Timed'][newMode] ?? `Unknown (${newMode})`
    this.logInfo(`mode changed to: ${modeName}.`)

    // Example: Refuse Timed until a schedule has been set up on the heater
    // if (newMode === MODE_TIMED && !this.hasSchedule) {
    //   throw this.statusError('InvalidInState', 'Set up a heating schedule first')
    // }

    // TODO: await myWaterHeaterAPI.setMode(newMode)
  }

  /**
   * A boost heats the tank now, for a set time, whatever the mode says.
   * Homebridge records the boost as active once this returns - the plugin has
   * to end it, here when the duration runs out.
   */
  private async handleBoost(durationSeconds: number): Promise<void> {
    this.logInfo(`boosting for ${durationSeconds} seconds.`)
    // TODO: await myWaterHeaterAPI.boost(durationSeconds)

    this.clearBoostTimer()
    this.boostTimer = setTimeout(() => {
      this.boostTimer = undefined
      void this.endBoost().catch(error => this.logError('Failed to end the boost:', error))
    }, durationSeconds * 1000)
  }

  private async handleCancelBoost(): Promise<void> {
    this.logInfo('boost cancelled.')
    this.clearBoostTimer()
    // TODO: await myWaterHeaterAPI.cancelBoost()
  }

  private async endBoost(): Promise<void> {
    await this.updateState('waterHeaterManagement', { boostState: BOOST_INACTIVE })
    this.logInfo('boost finished.')
  }

  private clearBoostTimer(): void {
    if (this.boostTimer) {
      clearTimeout(this.boostTimer)
      this.boostTimer = undefined
    }
  }

  public override shutdown(): void {
    this.clearBoostTimer()
  }

  public async updateWaterTemperature(celsius: number): Promise<void> {
    await this.updateState('thermostat', {
      externalMeasuredIndoorTemperature: Math.round(celsius * 100),
    })
    this.logInfo(`water temperature: ${celsius}°C.`)
  }

  public async updateHeating(heating: boolean): Promise<void> {
    await this.updateState('waterHeaterManagement', {
      heatDemand: heating
        ? { immersionElement1: true }
        : {},
    })
    this.logInfo(`heating: ${heating ? 'yes' : 'no'}.`)
  }

  public async updateBoostActive(active: boolean): Promise<void> {
    await this.updateState('waterHeaterManagement', {
      boostState: active
        ? BOOST_ACTIVE
        : BOOST_INACTIVE,
    })
  }
}
