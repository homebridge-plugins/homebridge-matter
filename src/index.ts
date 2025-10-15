import type { API } from 'homebridge'

import { ExampleHomebridgePlatform } from './platform.js'
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js'

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, ExampleHomebridgePlatform)
}
