/**
 * Common types for Matter device implementations
 */

import type { API, Logging, PlatformConfig } from 'homebridge'

/**
 * Device registration function signature
 */
export type DeviceRegistrar = (
  api: API,
  log: Logging,
  config: PlatformConfig,
) => any[]

/**
 * Base context passed to all device registrars
 */
export interface DeviceContext {
  api: API
  log: Logging
  config: PlatformConfig
}
