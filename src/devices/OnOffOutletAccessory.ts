/**
 * On/Off Outlet Accessory Class
 *
 * Also demonstrates the electrical power + energy measurement support added
 * in Homebridge v2.2.0: declaring `electricalPowerMeasurement` and/or
 * `electricalEnergyMeasurement` cluster state makes Homebridge auto-detect
 * the clusters, add the ElectricalSensor device type (0x0510) to the
 * endpoint and synthesize the mandatory accuracy metadata for you. This
 * outlet simulates a ~60 W appliance so controllers (e.g. Apple Home on
 * iOS 27+) can show live power draw and a cumulative energy total.
 */

import type { API, Logger } from 'homebridge'

import { getMatter } from '../utils.js'
import { BaseMatterAccessory } from './BaseMatterAccessory.js'

// All electrical measurement values use the raw Matter units:
// voltage in millivolts, current in milliamps, power in milliwatts and
// energy in milliwatt-hours. `null` means "no measurement available".
const SIMULATED_VOLTAGE_MV = 230_000 // 230 V mains
const SIMULATED_POWER_MW = 60_000 // a ~60 W load when the outlet is on

// How often the simulated energy total is pushed while the outlet is on.
// Keep energy updates to a sane cadence in real plugins too: every
// `electricalEnergyMeasurement` update emits a spec-required measurement
// event to subscribed controllers (they are not throttled the way
// frequently-changing power attributes are).
const ENERGY_UPDATE_INTERVAL_MS = 60_000

export class OnOffOutletAccessory extends BaseMatterAccessory {
  private energyTimer?: ReturnType<typeof setInterval>
  private cumulativeEnergyMwh = 0
  private lastEnergyTickMs = 0

  constructor(api: API, log: Logger) {
    const serialNumber = 'matter-onoff-outlet'
    const matter = getMatter(api)
    super(api, log, {
      UUID: matter.uuid.generate(serialNumber),
      displayName: 'On/Off Outlet',
      deviceType: matter.deviceTypes.OnOffOutlet,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-OUTLET-ON-OFF',
      firmwareRevision: '2.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        onOff: {
          onOff: false,
        },

        // Declaring this state is all it takes — Homebridge (>= 2.2.0)
        // detects it, applies the ElectricalPowerMeasurement behavior and
        // advertises the ElectricalSensor device type on this endpoint.
        // powerMode, numberOfMeasurementTypes and accuracy are synthesized
        // with sensible defaults when omitted.
        electricalPowerMeasurement: {
          voltage: SIMULATED_VOLTAGE_MV,
          activeCurrent: 0,
          activePower: 0,
        },

        // The energy cluster's features are chosen from which attributes
        // you declare — `cumulativeEnergyImported` selects a meter that
        // reports total imported energy (ImportedEnergy + CumulativeEnergy).
        electricalEnergyMeasurement: {
          cumulativeEnergyImported: { energy: 0 },
        },
      },

      handlers: {
        onOff: {
          on: async () => this.handleOn(),
          off: async () => this.handleOff(),
        },
      },
    })

    this.logInfo('initialized.')
  }

  private async handleOn(): Promise<void> {
    this.logInfo('turning on.')

    // Example: Check for overcurrent protection
    // if (this.hasOvercurrentTripped) {
    //   throw new MatterStatus.InvalidInState('Outlet overcurrent protection tripped - reset required')
    // }

    // Example: Check power monitoring threshold
    // if (this.lastPowerDraw > this.maxWattage) {
    //   throw new MatterStatus.InvalidInState(`Cannot turn on - last load exceeded ${this.maxWattage}W limit`)
    // }

    // Example: Check if outlet is disabled by physical safety lock
    // if (this.isPhysicallyLocked) {
    //   throw new MatterStatus.PermissionDenied('Outlet is physically locked for safety')
    // }

    // TODO: await myOutletAPI.turnOn()

    await this.startPowerSimulation()
  }

  private async handleOff(): Promise<void> {
    this.logInfo('turning off.')

    // Example: Check if outlet can be turned off (some outlets with critical loads)
    // if (this.isCriticalLoad) {
    //   throw new MatterStatus.InvalidInState('Cannot turn off outlet with critical load connected')
    // }

    // TODO: await myOutletAPI.turnOff()

    await this.stopPowerSimulation()
  }

  public async updateOnOffState(isOn: boolean): Promise<void> {
    await this.updateState(this.matter.clusterNames.OnOff, { onOff: isOn })

    // Keep the simulated load in step when the state is changed from
    // outside the on/off handlers (e.g. a physical toggle in a real plugin)
    if (isOn) {
      await this.startPowerSimulation()
    } else {
      await this.stopPowerSimulation()
    }
  }

  /**
   * Simulate the plugged-in appliance drawing power. A real plugin would
   * push readings from its device here instead — the update call is the
   * same: updateState('electricalPowerMeasurement', { ... }).
   */
  private async startPowerSimulation(): Promise<void> {
    if (this.energyTimer) {
      return
    }
    this.lastEnergyTickMs = Date.now()

    // The load appears: report power, and the current it implies at 230 V
    // (mA = mW / mV * 1000)
    await this.updateState('electricalPowerMeasurement', {
      voltage: SIMULATED_VOLTAGE_MV,
      activeCurrent: Math.round((SIMULATED_POWER_MW / SIMULATED_VOLTAGE_MV) * 1000),
      activePower: SIMULATED_POWER_MW,
    })

    // Accumulate the energy total once a minute while on. Homebridge routes
    // energy updates through matter.js's setMeasurement(), which also emits
    // the CumulativeEnergyMeasured event the spec requires.
    this.energyTimer = setInterval(() => {
      void this.accumulateEnergy().catch((error) => {
        this.logDebug('Failed to update energy measurement:', error)
      })
    }, ENERGY_UPDATE_INTERVAL_MS)
  }

  private async stopPowerSimulation(): Promise<void> {
    if (this.energyTimer) {
      clearInterval(this.energyTimer)
      this.energyTimer = undefined
      // Bank the energy used since the last tick before the load disappears
      await this.accumulateEnergy()
    }

    await this.updateState('electricalPowerMeasurement', {
      voltage: SIMULATED_VOLTAGE_MV,
      activeCurrent: 0,
      activePower: 0,
    })
  }

  private async accumulateEnergy(): Promise<void> {
    const now = Date.now()
    const elapsedHours = (now - this.lastEnergyTickMs) / 3_600_000
    this.lastEnergyTickMs = now

    // mWh = mW x hours
    this.cumulativeEnergyMwh += SIMULATED_POWER_MW * elapsedHours

    await this.updateState('electricalEnergyMeasurement', {
      cumulativeEnergyImported: { energy: Math.round(this.cumulativeEnergyMwh) },
    })
  }
}
