/**
 * EV Charger Accessory Class
 *
 * An electric vehicle charger (Matter Spec § 14.1, "EVSE"). Requires
 * Homebridge v2.5.0 or later.
 *
 * The charger's own endpoint carries two clusters:
 * - energyEvse: the charger state - whether a car is plugged in, whether
 *   charging is allowed, and the current limits
 * - energyEvseMode: its modes. One must be tagged Manual
 *
 * and three parts, as the spec requires: a wired PowerSource, an
 * ElectricalSensor for the power going to the car, and a
 * DeviceEnergyManagement part declaring a forecast (which turns on its
 * PowerForecastReporting feature).
 *
 * Optional energyEvse attributes turn on extra features when declared:
 * stateOfCharge or batteryCapacity add SoCReporting, vehicleId adds
 * PlugAndCharge, and any discharging attribute adds V2X (vehicle to grid).
 *
 * matter.js implements none of the charger's commands. Without a handler,
 * Homebridge records each command in the state; with one, the plugin acts on
 * it first.
 *
 * ⚠️ It is not yet known how Apple Home presents this device type. Other Matter
 * controllers may show it before Apple Home does.
 */

import type { API, Logger } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

const VOLTAGE_MV = 230_000 // 230 V

// energyEvse state: 0 = not plugged in, 1 = plugged in (no demand),
// 2 = plugged in (demand), 3 = charging, 4 = discharging, 5 = session ending, 6 = fault
const STATE_NOT_PLUGGED_IN = 0
const STATE_PLUGGED_IN = 1
const STATE_CHARGING = 3

// supplyState: 0 = disabled, 1 = charging enabled
const SUPPLY_DISABLED = 0
const SUPPLY_CHARGING_ENABLED = 1

// Mode tags from the Matter spec
const MODE_TAG_MANUAL = 0x4000
const MODE_TAG_TIME_OF_USE = 0x4001
const MODE_TAG_SOLAR_CHARGING = 0x4002

export class EvChargerAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-ev-charger'
    const matter = getMatter(api)
    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'EV Charger',
      deviceType: matter.deviceTypes.EnergyEvse,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-EV-CHARGER',
      firmwareRevision: '1.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        energyEvse: {
          state: STATE_PLUGGED_IN,
          supplyState: SUPPLY_DISABLED,
          faultState: 0, // no error
          chargingEnabledUntil: null, // null = until told otherwise
          circuitCapacity: 32_000, // the circuit allows 32 A (in mA)
          minimumChargeCurrent: 6_000, // 6 A is the lowest a car accepts
          maximumChargeCurrent: 0, // 0 until charging is enabled
        },
        energyEvseMode: {
          supportedModes: [
            {
              label: 'Manual',
              mode: 0,
              modeTags: [
                { value: MODE_TAG_MANUAL },
              ],
            },
            {
              label: 'Cheapest Times',
              mode: 1,
              modeTags: [
                { value: MODE_TAG_TIME_OF_USE },
              ],
            },
            {
              label: 'Solar Only',
              mode: 2,
              modeTags: [
                { value: MODE_TAG_SOLAR_CHARGING },
              ],
            },
          ],
          currentMode: 0,
        },
      },

      handlers: {
        energyEvse: {
          enableCharging: async request => this.handleEnableCharging(request.minimumChargeCurrent, request.maximumChargeCurrent),
          disable: async () => this.handleDisable(),
        },
        energyEvseMode: {
          changeToMode: async request => this.handleModeChange(request.newMode),
        },
      },

      parts: [
        {
          id: 'supply',
          displayName: 'Supply',
          deviceType: matter.deviceTypes.PowerSource,
          clusters: {
            powerSource: {
              status: 1, // active
              order: 0,
              description: 'Mains',
              wiredCurrentType: 0, // AC
            },
          },
        },
        {
          id: 'meter',
          displayName: 'Charging Power',
          deviceType: matter.deviceTypes.ElectricalSensor,
          clusters: {
            electricalPowerMeasurement: {
              voltage: VOLTAGE_MV,
              activeCurrent: 0,
              activePower: 0,
            },
            electricalEnergyMeasurement: {
              cumulativeEnergyImported: { energy: 0 },
            },
          },
        },
        {
          id: 'energy-management',
          displayName: 'Energy Management',
          deviceType: matter.deviceTypes.DeviceEnergyManagement,
          clusters: {
            deviceEnergyManagement: {
              esaType: 0, // EVSE
              esaCanGenerate: false,
              esaState: 1, // online
              absMinPower: 0,
              absMaxPower: 7_400_000, // 7.4 kW (32 A at 230 V)
              forecast: null, // declaring a forecast turns on PowerForecastReporting
            },
          },
        },
      ],
    })

    this.logInfo('initialized.')
  }

  /**
   * A controller allows charging, within these current limits (in mA).
   * Homebridge records the new supply state once this returns.
   */
  private async handleEnableCharging(minimumMilliamps: number | bigint, maximumMilliamps: number | bigint): Promise<void> {
    this.logInfo(`charging enabled, between ${Number(minimumMilliamps) / 1000} A and ${Number(maximumMilliamps) / 1000} A.`)
    // TODO: await myChargerAPI.enableCharging(Number(maximumMilliamps) / 1000)
  }

  private async handleDisable(): Promise<void> {
    this.logInfo('charging disabled.')
    // TODO: await myChargerAPI.disable()
  }

  private async handleModeChange(newMode: number): Promise<void> {
    const modeName = ['Manual', 'Cheapest Times', 'Solar Only'][newMode] ?? `Unknown (${newMode})`
    this.logInfo(`mode changed to: ${modeName}.`)
    // TODO: await myChargerAPI.setMode(newMode)
  }

  /**
   * Report whether a car is plugged in, and whether it is charging.
   */
  public async updateVehicle(pluggedIn: boolean, charging: boolean): Promise<void> {
    await this.updateState('energyEvse', {
      state: !pluggedIn
        ? STATE_NOT_PLUGGED_IN
        : charging ? STATE_CHARGING : STATE_PLUGGED_IN,
      supplyState: charging
        ? SUPPLY_CHARGING_ENABLED
        : SUPPLY_DISABLED,
    })
    this.logInfo(`car ${pluggedIn ? 'plugged in' : 'not plugged in'}${charging ? ', charging' : ''}.`)
  }

  /**
   * Report the power going to the car.
   * @param watts charging power, in watts
   */
  public async updateChargingPower(watts: number): Promise<void> {
    const milliwatts = Math.round(watts * 1000)
    await this.updateState('electricalPowerMeasurement', {
      voltage: VOLTAGE_MV,
      activeCurrent: Math.round((milliwatts / VOLTAGE_MV) * 1000),
      activePower: milliwatts,
    }, 'meter')
  }
}
