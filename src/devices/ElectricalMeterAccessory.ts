/**
 * Electrical Meter Accessory Class
 *
 * A meter on a circuit or the whole home, reporting power and energy (Matter
 * Spec § 14.8). Requires Homebridge v2.5.0 or later.
 *
 * Like the Electrical Sensor that outlets carry, its measurement clusters come
 * from the declared electricalPowerMeasurement and electricalEnergyMeasurement
 * state - declare the attributes the meter really reports, and Homebridge
 * picks the matching features. This one reports energy both ways: imported
 * from the grid and exported to it.
 *
 * All electrical values use the raw Matter units: millivolts, milliamps,
 * milliwatts and milliwatt-hours.
 *
 * ⚠️ It is not yet known how Apple Home presents this device type. Other Matter
 * controllers may show it before Apple Home does.
 */

import type { API, Logger } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

const VOLTAGE_MV = 230_000 // 230 V

export class ElectricalMeterAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-electrical-meter'
    const matter = getMatter(api)
    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'Electricity Meter',
      deviceType: matter.deviceTypes.ElectricalMeter,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-ELECTRICAL-METER',
      firmwareRevision: '1.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        electricalPowerMeasurement: {
          voltage: VOLTAGE_MV,
          activeCurrent: 4_350, // 4.35 A
          activePower: 1_000_000, // 1 kW drawn from the grid
        },
        // Both totals: cumulativeEnergyImported and cumulativeEnergyExported
        // turn on the ImportedEnergy, ExportedEnergy and CumulativeEnergy features
        electricalEnergyMeasurement: {
          cumulativeEnergyImported: { energy: 1_250_000_000 }, // 1250 kWh
          cumulativeEnergyExported: { energy: 310_000_000 }, // 310 kWh
        },
      },
    })

    this.logInfo('initialized.')
  }

  /**
   * Report the power through the meter. Positive is drawn from the grid,
   * negative is sent to it.
   * @param watts power, in watts
   */
  public async updatePower(watts: number): Promise<void> {
    const milliwatts = Math.round(watts * 1000)
    await this.updateState('electricalPowerMeasurement', {
      voltage: VOLTAGE_MV,
      activeCurrent: Math.round((milliwatts / VOLTAGE_MV) * 1000),
      activePower: milliwatts,
    })
    this.logInfo(`power: ${watts} W.`)
  }

  /**
   * Report the meter's running totals.
   * @param importedKwh total energy drawn from the grid, in kWh
   * @param exportedKwh total energy sent to the grid, in kWh
   */
  public async updateEnergy(importedKwh: number, exportedKwh: number): Promise<void> {
    await this.updateState('electricalEnergyMeasurement', {
      cumulativeEnergyImported: {
        energy: Math.round(importedKwh * 1_000_000),
      },
      cumulativeEnergyExported: {
        energy: Math.round(exportedKwh * 1_000_000),
      },
    })
  }
}
