/**
 * Solar Power Accessory Class
 *
 * A solar inverter reporting what it generates (Matter Spec § 14.3). Requires
 * Homebridge v2.5.0 or later.
 *
 * Solar Power is a composed device: the parent carries the device type, and
 * its parts carry what the spec requires of it:
 * - a wired PowerSource - the inverter's output. Declaring wired attributes and
 *   no battery ones gives it the Wired feature
 * - an ElectricalSensor reporting voltage, current, power and the energy
 *   exported so far
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
// Generation is reported as negative active power: power flowing out of the
// device, into the home or the grid
const GENERATING_MW = -2_500_000 // 2.5 kW

export class SolarPowerAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-solar-power'
    const matter = getMatter(api)
    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'Solar Power',
      deviceType: matter.deviceTypes.SolarPower,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-SOLAR-POWER',
      firmwareRevision: '1.0.0',
      hardwareRevision: '1.0.0',

      parts: [
        {
          id: 'inverter',
          displayName: 'Inverter',
          deviceType: matter.deviceTypes.PowerSource,
          clusters: {
            powerSource: {
              status: 1, // 0 = unspecified, 1 = active, 2 = standby, 3 = unavailable
              order: 0,
              description: 'Inverter',
              wiredCurrentType: 0, // 0 = AC, 1 = DC
            },
          },
        },
        {
          id: 'meter',
          displayName: 'Generation',
          deviceType: matter.deviceTypes.ElectricalSensor,
          clusters: {
            electricalPowerMeasurement: {
              voltage: VOLTAGE_MV,
              activeCurrent: Math.round((GENERATING_MW / VOLTAGE_MV) * 1000),
              activePower: GENERATING_MW,
            },
            // cumulativeEnergyExported selects a meter that reports the total
            // energy sent out (ExportedEnergy + CumulativeEnergy)
            electricalEnergyMeasurement: {
              cumulativeEnergyExported: { energy: 0 },
            },
          },
        },
      ],
    })

    this.logInfo('initialized.')
  }

  /**
   * Report the inverter's output. A real plugin would call this whenever the
   * inverter sends a reading.
   * @param watts power being generated, in watts
   */
  public async updateGeneration(watts: number): Promise<void> {
    const milliwatts = -Math.round(watts * 1000)
    await this.updateState('electricalPowerMeasurement', {
      voltage: VOLTAGE_MV,
      activeCurrent: Math.round((milliwatts / VOLTAGE_MV) * 1000),
      activePower: milliwatts,
    }, 'meter')
    this.logInfo(`generating ${watts} W.`)
  }

  /**
   * Report the total energy generated so far.
   * @param kilowattHours total exported energy, in kWh
   */
  public async updateEnergyExported(kilowattHours: number): Promise<void> {
    await this.updateState('electricalEnergyMeasurement', {
      cumulativeEnergyExported: {
        energy: Math.round(kilowattHours * 1_000_000),
      },
    }, 'meter')
  }
}
