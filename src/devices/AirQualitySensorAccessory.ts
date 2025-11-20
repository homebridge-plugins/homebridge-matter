/**
 * Air Quality Sensor Accessory Class
 *
 * This device combines multiple environmental sensors commonly found in air quality monitors:
 * - Air Quality (overall rating)
 * - PM2.5 (fine particulate matter)
 * - PM10 (coarse particulate matter)
 * - Temperature
 * - Relative Humidity
 */

import type { API, Logger } from 'homebridge'

import { BaseMatterAccessory } from './BaseMatterAccessory.js'

export class AirQualitySensorAccessory extends BaseMatterAccessory {
  constructor(api: API, log: Logger) {
    const serialNumber = 'SENSOR-008'
    super(api, log, {
      uuid: api.matter.uuid.generate(serialNumber),
      displayName: 'Air Quality Sensor',
      deviceType: api.matter.deviceTypes.AirQualitySensor,
      serialNumber,
      manufacturer: 'Homebridge Matter',
      model: 'HB-MATTER-SENSOR-AIR-QUALITY',
      firmwareRevision: '1.0.0',
      hardwareRevision: '1.0.0',

      clusters: {
        // Overall air quality rating
        // 0 = Unknown, 1 = Good, 2 = Fair, 3 = Moderate, 4 = Poor, 5 = VeryPoor, 6 = ExtremelyPoor
        airQuality: {
          airQuality: 1, // Default: Good
        },

        // Note: the only cluster that appears in the Home app is the Air Quality cluster.
        // The other measurements can be accessed by other Matter-compatible apps.

        // PM2.5 - Fine particulate matter (≤2.5 micrometers)
        // Values in µg/m³ (micrograms per cubic meter)
        pm25ConcentrationMeasurement: {
          measuredValue: 12, // 12 µg/m³ (Good air quality)
          minMeasuredValue: 0,
          maxMeasuredValue: 1000,
          measurementUnit: 0, // 0 = µg/m³
          measurementMedium: 0, // 0 = Air
        },

        // PM10 - Coarse particulate matter (≤10 micrometers)
        // Values in µg/m³
        pm10ConcentrationMeasurement: {
          measuredValue: 25, // 25 µg/m³ (Good air quality)
          minMeasuredValue: 0,
          maxMeasuredValue: 1000,
          measurementUnit: 0, // 0 = µg/m³
          measurementMedium: 0, // 0 = Air
        },

        // Temperature measurement (in hundredths of °C)
        temperatureMeasurement: {
          measuredValue: 2100, // 21.00°C
          minMeasuredValue: -5000, // -50°C
          maxMeasuredValue: 10000, // 100°C
        },

        // Relative humidity (in hundredths of a percent)
        relativeHumidityMeasurement: {
          measuredValue: 5500, // 55%
          minMeasuredValue: 0,
          maxMeasuredValue: 10000, // 100%
        },
      },
    })

    this.logInfo('initialized.')
  }

  /**
   * Update the overall air quality rating
   * @param quality 0 = Unknown, 1 = Good, 2 = Fair, 3 = Moderate, 4 = Poor, 5 = VeryPoor, 6 = ExtremelyPoor
   */
  public async updateAirQuality(quality: 0 | 1 | 2 | 3 | 4 | 5 | 6): Promise<void> {
    await this.updateState('airQuality', { airQuality: quality })
    const qualityStr = ['Unknown', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor', 'Extremely Poor'][quality]
    this.logInfo(`air quality: ${qualityStr}.`)
  }

  /**
   * Update PM2.5 concentration
   * @param value Concentration in µg/m³ (micrograms per cubic meter)
   */
  public async updatePM25(value: number): Promise<void> {
    await this.updateState('pm25ConcentrationMeasurement', { measuredValue: value })
    this.logInfo(`PM2.5: ${value} µg/m³.`)
  }

  /**
   * Update PM10 concentration
   * @param value Concentration in µg/m³ (micrograms per cubic meter)
   */
  public async updatePM10(value: number): Promise<void> {
    await this.updateState('pm10ConcentrationMeasurement', { measuredValue: value })
    this.logInfo(`PM10: ${value} µg/m³.`)
  }

  /**
   * Update temperature
   * @param celsius Temperature in degrees Celsius
   */
  public async updateTemperature(celsius: number): Promise<void> {
    const value = Math.round(celsius * 100) // convert to hundredths
    await this.updateState('temperatureMeasurement', { measuredValue: value })
    this.logInfo(`temperature: ${celsius}°C.`)
  }

  /**
   * Update relative humidity
   * @param percent Humidity as a percentage (0-100)
   */
  public async updateHumidity(percent: number): Promise<void> {
    const value = Math.round(percent * 100) // convert to hundredths
    await this.updateState('relativeHumidityMeasurement', { measuredValue: value })
    this.logInfo(`humidity: ${percent}%.`)
  }

  /**
   * Update all sensor values at once
   */
  public async updateAllValues(values: {
    airQuality?: 0 | 1 | 2 | 3 | 4 | 5 | 6
    pm25?: number
    pm10?: number
    temperature?: number
    humidity?: number
  }): Promise<void> {
    if (values.airQuality !== undefined) {
      await this.updateAirQuality(values.airQuality)
    }
    if (values.pm25 !== undefined) {
      await this.updatePM25(values.pm25)
    }
    if (values.pm10 !== undefined) {
      await this.updatePM10(values.pm10)
    }
    if (values.temperature !== undefined) {
      await this.updateTemperature(values.temperature)
    }
    if (values.humidity !== undefined) {
      await this.updateHumidity(values.humidity)
    }
  }
}
