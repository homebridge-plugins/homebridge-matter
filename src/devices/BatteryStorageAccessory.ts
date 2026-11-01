/**
 * Battery Storage Accessory Class
 *
 * A home battery that stores energy and gives it back (Matter Spec § 14.4).
 * Requires Homebridge v2.5.0 or later.
 *
 * Battery Storage is a composed device. Its parts are what the spec requires:
 * - two PowerSources: the battery itself (declaring bat* attributes gives it
 *   the Battery and Rechargeable features) and the wired grid side
 * - an ElectricalSensor for each of the AC and DC sides, both reporting power
 *   and energy. The DC one declares `powerMode: 1` so it measures direct current
 * - a DeviceEnergyManagement part, which lets a controller ask the battery to
 *   charge or discharge at a set power for a while. Declaring
 *   powerAdjustmentCapability turns on its PowerAdjustment feature
 *
 * All electrical values use the raw Matter units: millivolts, milliamps,
 * milliwatts and milliwatt-hours. Positive power is charging (into the
 * battery), negative is discharging.
 *
 * ⚠️ It is not yet known how Apple Home presents this device type. Other Matter
 * controllers may show it before Apple Home does.
 */

import type { API, Logger } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

const AC_VOLTAGE_MV = 230_000 // 230 V
const DC_VOLTAGE_MV = 400_000 // 400 V battery pack
const MAX_POWER_MW = 5_000_000 // 5 kW either way

export class BatteryStorageAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-battery-storage'
    const matter = getMatter(api)
    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'Home Battery',
      deviceType: matter.deviceTypes.BatteryStorage,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-BATTERY-STORAGE',
      firmwareRevision: '1.0.0',
      hardwareRevision: '1.0.0',

      parts: [
        {
          id: 'battery',
          displayName: 'Battery',
          deviceType: matter.deviceTypes.PowerSource,
          clusters: {
            powerSource: {
              status: 1, // active
              order: 0,
              description: 'Battery',
              batPercentRemaining: 160, // in half-percent steps: 160 = 80%
              batChargeLevel: 0, // 0 = ok, 1 = warning, 2 = critical
              batReplacementNeeded: false,
              batReplaceability: 3, // 3 = factory replaceable
              batChargeState: 3, // 0 = unknown, 1 = charging, 2 = full, 3 = not charging
              batFunctionalWhileCharging: true,
              // A battery storage device's battery must also report these. null
              // means "not known right now"
              batVoltage: DC_VOLTAGE_MV,
              batCapacity: 33_750, // rated capacity in mAh: 13.5 kWh at 400 V
              batTimeRemaining: null, // seconds until empty, at the current load
              batTimeToFullCharge: null, // seconds until full, while charging
              batChargingCurrent: null, // mA
              activeBatFaults: [],
              activeBatChargeFaults: [],
            },
          },
        },
        {
          id: 'grid',
          displayName: 'Grid Connection',
          deviceType: matter.deviceTypes.PowerSource,
          clusters: {
            powerSource: {
              status: 1,
              order: 1,
              description: 'Grid',
              wiredCurrentType: 0, // AC
            },
          },
        },
        {
          id: 'ac-meter',
          displayName: 'AC Side',
          deviceType: matter.deviceTypes.ElectricalSensor,
          clusters: {
            electricalPowerMeasurement: {
              voltage: AC_VOLTAGE_MV,
              activeCurrent: 0,
              activePower: 0,
            },
            electricalEnergyMeasurement: {
              cumulativeEnergyImported: { energy: 0 },
              cumulativeEnergyExported: { energy: 0 },
            },
          },
        },
        {
          id: 'dc-meter',
          displayName: 'DC Side',
          deviceType: matter.deviceTypes.ElectricalSensor,
          clusters: {
            electricalPowerMeasurement: {
              powerMode: 1, // 1 = DC, 2 = AC (the default)
              voltage: DC_VOLTAGE_MV,
              activeCurrent: 0,
              activePower: 0,
            },
            electricalEnergyMeasurement: {
              cumulativeEnergyImported: { energy: 0 },
              cumulativeEnergyExported: { energy: 0 },
            },
          },
        },
        {
          id: 'energy-management',
          displayName: 'Energy Management',
          deviceType: matter.deviceTypes.DeviceEnergyManagement,
          clusters: {
            deviceEnergyManagement: {
              esaType: 5, // battery storage
              esaCanGenerate: true, // it can give energy back
              esaState: 1, // 0 = offline, 1 = online, 2 = fault, 3 = power adjust active, 4 = paused
              absMinPower: -MAX_POWER_MW,
              absMaxPower: MAX_POWER_MW,
              // Declaring this turns on the PowerAdjustment feature. null
              // capability means "no adjustment possible right now"
              powerAdjustmentCapability: {
                powerAdjustCapability: [
                  {
                    minPower: -MAX_POWER_MW,
                    maxPower: MAX_POWER_MW,
                    minDuration: 60,
                    maxDuration: 3600,
                  },
                ],
                cause: 0, // 0 = normal operation
              },
              optOutState: 0, // 0 = not opted out
            },
          },
          handlers: {
            deviceEnergyManagement: {
              powerAdjustRequest: async request => this.handlePowerAdjust(request.power, request.duration),
              cancelPowerAdjustRequest: async () => this.handleCancelPowerAdjust(),
            },
          },
        },
      ],
    })

    this.logInfo('initialized.')
  }

  /**
   * A controller asks the battery to run at a set power for a while - for
   * example to soak up cheap energy, or to cover the home's load at a peak.
   * Homebridge records the request in the cluster state once this returns.
   */
  private async handlePowerAdjust(power: number | bigint, durationSeconds: number): Promise<void> {
    const watts = Number(power) / 1000
    this.logInfo(`power adjust: ${watts >= 0
      ? 'charge'
      : 'discharge'} at ${Math.abs(watts)} W for ${durationSeconds} seconds.`)
    // TODO: await myBatteryAPI.setPower(watts, durationSeconds)
  }

  private async handleCancelPowerAdjust(): Promise<void> {
    this.logInfo('power adjust cancelled.')
    // TODO: await myBatteryAPI.resumeNormalOperation()
  }

  /**
   * Report the battery level.
   * @param percent charge level, 0 - 100
   * @param charging whether the battery is charging right now
   */
  public async updateBattery(percent: number, charging: boolean): Promise<void> {
    await this.updateState('powerSource', {
      batPercentRemaining: Math.round(percent * 2),
      batChargeState: charging
        ? 1
        : percent >= 100
          ? 2
          : 3,
    }, 'battery')
    this.logInfo(`battery: ${percent}%${charging ? ', charging' : ''}.`)
  }

  /**
   * Report the power flowing into (positive) or out of (negative) the battery.
   * @param watts power on the AC side, in watts
   */
  public async updatePower(watts: number): Promise<void> {
    const milliwatts = Math.round(watts * 1000)
    await this.updateState('electricalPowerMeasurement', {
      voltage: AC_VOLTAGE_MV,
      activeCurrent: Math.round((milliwatts / AC_VOLTAGE_MV) * 1000),
      activePower: milliwatts,
    }, 'ac-meter')
  }
}
