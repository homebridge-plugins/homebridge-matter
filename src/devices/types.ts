/**
 * Common types for Matter device implementations
 */

import type { API, Logging, PlatformConfig } from 'homebridge'

/**
 * Base context passed to all device registrars
 */
export interface DeviceContext {
  api: API
  log: Logging
  config: PlatformConfig
}

/**
 * Device registration function signature
 */
export type DeviceRegistrar = (
  context: DeviceContext,
) => any[]
